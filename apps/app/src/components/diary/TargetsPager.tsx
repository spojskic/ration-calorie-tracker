import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { EnergySummary, type EnergySummaryProps } from '@/components/charts/EnergySummary';
import { HighlightRings, type HighlightRingItem } from '@/components/charts/HighlightRings';
import { useAnimatedNumber } from '@/components/charts/use-animated-number';
import { AppText } from '@/components/ui';
import { spacing, useTheme, type ThemeColors } from '@/theme';

import { macroProgress, type PercentTone } from './macro-progress';
import type { MacroRow } from './targets-view';

export interface PagerPage {
  key: string;
  label: string;
  content: ReactNode;
}

/** Horizontal paging container with page dots (swipe on touch devices, tap the dots anywhere). */
export function Pager({ pages }: { pages: PagerPage[] }) {
  const { colors, shape } = useTheme();
  const scroller = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex((cur) => (cur === next ? cur : Math.max(0, Math.min(pages.length - 1, next))));
  };
  const goTo = (i: number) => {
    setIndex(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
  };

  const current = pages[index];

  return (
    <View style={styles.wrap}>
      <View onLayout={onLayout}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          accessibilityLabel="Targets, swipe for more"
          style={styles.scroller}>
          {pages.map((page) => (
            <View key={page.key} style={{ width: width || '100%' }}>
              {page.content}
            </View>
          ))}
        </ScrollView>
      </View>
      {pages.length > 1 ? (
        <View style={styles.dots} accessibilityRole="tablist">
          {pages.map((page, i) => (
            <Pressable
              key={page.key}
              accessibilityRole="tab"
              accessibilityLabel={`${page.label}${current?.key === page.key ? ', current page' : ''}`}
              accessibilityState={{ selected: i === index }}
              hitSlop={8}
              onPress={() => goTo(i)}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? colors.primary : colors.track,
                  width: i === index ? 16 : PAGER_DOT_SIZE,
                  borderRadius: shape.bar(PAGER_DOT_SIZE),
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// The percentage is text, not a bar: use the text-grade tones (4.5 : 1 on the card), while the fills keep the graphic ones.
const toneColor = (tone: PercentTone, colors: ThemeColors): string =>
  tone === 'success' ? colors.successText : tone === 'danger' ? colors.dangerText : colors.textMuted;

/**
 * One compact macro row: "Energy 2,376 / 2,195 kcal" on the left, the percentage on the right (green once a goal is
 * reached, red past a limit) and a thick fully rounded bar under it in the macro colour. Past 100 % the bar is
 * rescaled so a notch marks the target and the overflow is drawn in the success / danger colour.
 */
function MacroRowBar({ row }: { row: MacroRow }) {
  const { colors, shape } = useTheme();
  // The bar tweens its value in (the same 280ms driver the rings use), so on dashboard load the bars
  // fill alongside the rings instead of teleporting to full width. Texts and accessibility read the
  // real value; only the geometry is animated. reduce-motion renders the settled value immediately.
  const tweened = useAnimatedNumber(row.value ?? 0);
  const shownValue = row.value === undefined ? undefined : tweened;
  const p = macroProgress({
    value: shownValue,
    target: row.target,
    unit: row.unit,
    decimals: row.decimals,
    overIsBad: row.overIsBad,
  });
  const real = macroProgress({
    value: row.value,
    target: row.target,
    unit: row.unit,
    decimals: row.decimals,
    overIsBad: row.overIsBad,
  });
  const overColor = row.overIsBad ? colors.danger : colors.success;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${row.label}: ${real.valueText}${real.pctText ? `, ${real.pctText}` : ''}`}
      accessibilityValue={real.now === undefined ? undefined : { min: 0, max: 100, now: real.now }}
      style={styles.macro}>
      <View style={styles.macroLine}>
        <AppText variant="small" numberOfLines={1} style={styles.macroText}>
          <AppText variant="small" style={styles.macroLabel}>
            {row.label}
          </AppText>
          <AppText variant="small" muted>{`  ${p.valueText}`}</AppText>
        </AppText>
        <AppText variant="small" numberOfLines={1} style={[styles.macroPct, { color: toneColor(real.tone, colors) }]}>
          {real.pctText}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.track, borderRadius: shape.bar(MACRO_TRACK_HEIGHT) }]}>
        <View style={[styles.segment, { left: 0, width: `${p.mainFill * 100}%`, backgroundColor: row.color }]} />
        {p.markAt !== undefined ? (
          <>
            <View
              style={[styles.segment, { left: `${p.markAt * 100}%`, width: `${p.overFill * 100}%`, backgroundColor: overColor }]}
            />
            <View style={[styles.notch, { left: `${p.markAt * 100}%`, backgroundColor: colors.surface }]} />
          </>
        ) : null}
      </View>
    </View>
  );
}

/** Macro bars (Energy, Protein, Net Carbs, Fat): tight rows without a card around each. */
export function MacroBars({ rows }: { rows: MacroRow[] }) {
  return (
    <View style={styles.bars}>
      {rows.map((row) => (
        <MacroRowBar key={row.key} row={row} />
      ))}
    </View>
  );
}

/**
 * "TARGETS ›" (opens the targets sheet with the full energy and nutrient panels) and "CONSUMED" (what the
 * numbers below are) above the pager. The whole row is the tap target for the sheet: the pager below keeps
 * the swipe gesture, so tap = details, swipe = pages.
 */
export function TargetsHeader({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Targets overview, open energy and nutrient details"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.header, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.headerLink}>
        <AppText variant="label" muted>
          Targets
        </AppText>
        <AppText variant="label" muted>
          {'\u203A'}
        </AppText>
      </View>
      <AppText variant="label" muted>
        Consumed
      </AppText>
    </Pressable>
  );
}

/** Phone targets card content: macro bars / energy rings / highlighted nutrients, as swipeable pages. */
export function TargetsPager({
  rows,
  energy,
  highlights,
}: {
  rows: MacroRow[];
  energy: EnergySummaryProps;
  highlights: HighlightRingItem[];
}) {
  const pages: PagerPage[] = [
    { key: 'macros', label: 'Macros', content: <MacroBars rows={rows} /> },
    { key: 'energy', label: 'Energy', content: <EnergySummary {...energy} compact animated={false} /> },
  ];
  if (highlights.length > 0) {
    pages.push({
      key: 'nutrients',
      label: 'Highlighted nutrients',
      content: (
        <View style={styles.highlights}>
          <AppText variant="label" muted>
            Highlighted nutrients
          </AppText>
          <HighlightRings items={highlights.slice(0, 8)} size={52} />
        </View>
      ),
    });
  }
  return <Pager pages={pages} />;
}

const MACRO_TRACK_HEIGHT = 10;
const PAGER_DOT_SIZE = 6;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  scroller: { flexGrow: 0 },
  bars: { gap: spacing.sm + 2, paddingRight: 1 },
  macro: { gap: 3 },
  macroLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  macroText: { flex: 1 },
  macroLabel: { fontWeight: '700' },
  macroPct: { fontWeight: '700', minWidth: 40, textAlign: 'right' },
  track: { height: MACRO_TRACK_HEIGHT, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0 },
  notch: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  headerLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  highlights: { gap: spacing.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: PAGER_DOT_SIZE },
});
