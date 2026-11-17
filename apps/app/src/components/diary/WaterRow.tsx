import { Pressable, StyleSheet, View } from 'react-native';

import { formatVolume, volumeNumber, volumeUnit } from '@/components/activity/format';
import { pressedDip } from '@/components/press';
import { AppText } from '@/components/ui';
import { useUnitSystem } from '@/data/profile';
import { spacing, useTheme } from '@/theme';

/** Default daily water goal when no water target is configured. */
export const DEFAULT_WATER_TARGET_ML = 2600;
/** Amount suggested by the quick-add button. */
export const QUICK_WATER_ML = 250;

const TRACK_HEIGHT = 8;

/**
 * Water progress (ml / target) as a flat row with a quick-add button that logs directly; the row itself opens the
 * water form. Both numbers and the button are in the user's units ("1,080 / 3,700 mL" or "36.5 / 125.1 fl oz").
 */
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
  const { colors, radius } = useTheme();
  const system = useUnitSystem();
  const value = ml ?? 0;
  const fraction = target > 0 ? value / target : 0;

  // Two sibling pressables, not a nested pair: react-native-web renders Pressable as <button>, and a
  // <button> inside a <button> is invalid DOM (it also trips axe's nested-interactive rule). The info
  // area opens the water form; the + button beside it quick-adds.
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
          accessibilityLabel={`Water ${formatVolume(value, system)} of ${formatVolume(target, system)} goal`}
          accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.round(fraction * 100)) }}>
          <View style={styles.line}>
            <AppText style={{ fontWeight: '700' }}>Water</AppText>
            <AppText variant="small" muted>
              {ml === undefined
                ? '-'
                : `${volumeNumber(value, system)} / ${volumeNumber(target, system)} ${volumeUnit(system)}`}
            </AppText>
          </View>
        </View>
        <WaterProgressTrack fraction={fraction} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${formatVolume(QUICK_WATER_ML, system)} of water`}
        onPress={onAdd}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? colors.track : colors.surfaceAlt, borderColor: colors.border, borderRadius: radius.pill },
        ]}>
        <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>+ {formatVolume(QUICK_WATER_ML, system)}</AppText>
      </Pressable>
    </View>
  );
}

/**
 * The thin progress track under a water total: filled to `fraction`, green once the goal is reached. Shared by the
 * diary row and the water form, so both draw the same thing. The caller owns the accessible label.
 */
export function WaterProgressTrack({ fraction }: { fraction: number }) {
  const { colors, shape } = useTheme();
  const reached = fraction >= 1;
  return (
    <View style={[styles.track, { backgroundColor: colors.track, borderRadius: shape.bar(TRACK_HEIGHT) }]}>
      <View
        style={{
          width: `${Math.min(1, Math.max(0, fraction)) * 100}%`,
          height: '100%',
          backgroundColor: reached ? colors.success : colors.carbs,
        }}
      />
    </View>
  );
}

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
