import { StyleSheet, View } from 'react-native';

import { useAnimatedNumber } from '@/components/charts/use-animated-number';
import { AppText } from '@/components/ui';
import { spacing, useTheme, type ThemeColors } from '@/theme';

import { macroProgress, type PercentTone } from './macro-progress';
import type { MacroRow } from './targets-view';

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

const MACRO_TRACK_HEIGHT = 10;

const styles = StyleSheet.create({
  bars: { gap: spacing.sm + 2, paddingRight: 1 },
  macro: { gap: 3 },
  macroLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  macroText: { flex: 1 },
  macroLabel: { fontWeight: '700' },
  macroPct: { fontWeight: '700', minWidth: 40, textAlign: 'right' },
  track: { height: MACRO_TRACK_HEIGHT, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0 },
  notch: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
});
