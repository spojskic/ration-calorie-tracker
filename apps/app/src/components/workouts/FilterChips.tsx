import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/settings/rows';
import { spacing } from '@/theme';

export interface ChipItem<K extends string> {
  key: K;
  label: string;
}

/**
 * A row of filter chips that wraps onto a second line when it does not fit. It used to scroll sideways, which hid the
 * last options completely on a 390 px phone ("Manual", the last source; the last kind) - a filter nobody scrolls to
 * find might as well not exist. The rows are short (four or five chips), so wrapping stays at two lines at most.
 */
export function ChipRow<K extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly ChipItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Accessible name of the group ("Filter by source"). */
  label: string;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {items.map((item) => (
        <Chip key={item.key} label={item.label} selected={item.key === value} onPress={() => onChange(item.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});
