import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber } from '@/components/charts/format';
import { pressedDip } from '@/components/press';
import { AppText } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

/** Default daily water goal when no water target is configured. */
export const DEFAULT_WATER_TARGET_ML = 2600;
/** Amount suggested by the quick-add button. */
export const QUICK_WATER_ML = 250;

/** Water progress (ml / target) as a flat row with a quick "+250 ml" button that adds directly; the row itself opens the water form. */
export function WaterRow({
  ml,
  target,
  onAdd,
  onOpen,
}: {
  ml: number | undefined;
  target: number;
  onAdd: () => void;
  /** Opens the water form (any amount, history): the whole info area is the tap target. */
  onOpen: () => void;
}) {
  const { colors, radius, shape } = useTheme();
  const value = ml ?? 0;
  const fraction = target > 0 ? value / target : 0;
  const reached = fraction >= 1;

  // Two sibling pressables, not a nested pair: react-native-web renders Pressable as <button>, and a
  // <button> inside a <button> is invalid DOM (it also trips axe's nested-interactive rule).
  return (
    <View
      style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.background }]}> 
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open water logging"
        onPress={onOpen}
        style={({ pressed }) => [styles.info, pressed && { opacity: pressedDip(pressed).opacity }]}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Water ${formatNumber(value)} of ${formatNumber(target)} millilitres`}
          accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.round(fraction * 100)) }}>
        <View style={styles.line}>
          <AppText style={{ fontWeight: '700' }}>Water</AppText>
          <AppText variant="small" muted>
            {ml === undefined ? '-' : formatNumber(value)} / {formatNumber(target)} ml
          </AppText>
        </View>
        <View style={[styles.track, { backgroundColor: colors.track, borderRadius: shape.bar(TRACK_HEIGHT) }]}>
          <View
            style={{
              width: `${Math.min(1, fraction) * 100}%`,
              height: '100%',
              backgroundColor: reached ? colors.success : colors.carbs,
            }}
          />
        </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${QUICK_WATER_ML} millilitres of water`}
        onPress={onAdd}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? colors.track : colors.surfaceAlt, borderColor: colors.border, borderRadius: radius.pill },
        ]}>
        <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>+ {QUICK_WATER_ML} ml</AppText>
      </Pressable>
    </View>
  );
}

const TRACK_HEIGHT = 8;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: spacing.xs + 2 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: TRACK_HEIGHT, overflow: 'hidden' },
  button: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
