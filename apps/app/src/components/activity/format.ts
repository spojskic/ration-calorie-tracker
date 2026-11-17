import { mlToFlOz, type UnitSystem } from '@ration/core';

import { formatNumber } from '@/components/charts/format';
import { fromISODate, todayISO } from '@/state/selected-date';

/** Rounds to `dp` decimals and drops trailing zeros ("2", "2.5"). */
export function trimNum(value: number, dp = 1): string {
  const r = Number(value.toFixed(dp));
  return String(Object.is(r, -0) ? 0 : r);
}

/** "Tuesday, November 10" (+ " (today)"). */
export function formatDateLabel(iso: string): string {
  const label = fromISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return iso === todayISO() ? `${label} (today)` : label;
}

/** Short date for context lines: "Nov 3". */
export function formatShortDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Water/drink volume in the user's units: "250 mL", "1.25 L" or "8.5 fl oz". */
export function formatVolume(ml: number, system: UnitSystem): string {
  if (system === 'imperial') return `${trimNum(mlToFlOz(ml), 1)} fl oz`;
  return ml >= 1000 ? `${trimNum(ml / 1000, 2)} L` : `${Math.round(ml)} mL`;
}

/** The volume unit of the user's system as it is printed: "mL" / "fl oz". */
export function volumeUnit(system: UnitSystem): string {
  return system === 'imperial' ? 'fl oz' : 'mL';
}

/**
 * A water amount as a bare number in the user's unit, for a pair that names the unit once: "1,080 / 3,700 mL",
 * "36.5 / 125.1 fl oz". `formatVolume` is for a value that stands on its own.
 */
export function volumeNumber(ml: number, system: UnitSystem): string {
  return system === 'imperial' ? trimNum(mlToFlOz(ml), 1) : formatNumber(ml);
}
