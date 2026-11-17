import { useState } from 'react';
import { G_PER_OZ, convertVolume, gramsFromVolume, implausibleAmount, parseNumber } from '@ration/core';

import type { FoodPortion } from '@/data/foods';

import { formatKcal, trimNumber } from './format';

/** One selectable unit in the serving picker. `gramsPerUnit` is the mass of ONE unit. */
export interface ServingOption {
  key: string;
  label: string;
  gramsPerUnit: number;
  kind: 'portion' | 'mass' | 'volume';
  /** Amount prefilled when the user picks this unit without typing a number first. */
  defaultAmount: number;
  /**
   * What a chip prints when it is not the same as `label`. Only set for units whose label another unit of the
   * same row shares: the per-unit grams then tell them apart ("cup · 81 g" next to "cup · 40 g").
   */
  displayLabel?: string;
}

/** Labels are one when they differ only in case or surrounding space ("Cup", "cup "). */
const labelKey = (label: string): string => label.trim().toLowerCase();

/** Grams that print the same are the same unit (portion rows carry float grams). */
const sameGrams = (a: number, b: number): boolean => Math.abs(a - b) < 0.01;

/**
 * Cleans up one row of units, which can carry two problems:
 *  - the same unit twice (same label AND same grams - a "1 cup" and a "cup" portion row): only the first stays,
 *  - two DIFFERENT units behind one label. "1/2 cup" and "1 cup" both strip to "cup" (portionUnitLabel in
 *    data/foods keeps only the unit word), and one row of two identical "cup" chips silently halves or doubles a
 *    recipe ingredient. Those chips get their per-unit grams ("cup · 40 g", "cup · 81 g").
 *
 * `label` itself stays as it is: it is what the diary stores as `portionLabel` and what the edit sheet matches on.
 */
function nameUnits(options: ServingOption[]): ServingOption[] {
  const unique = options.filter(
    (o, i) =>
      options.findIndex((other) => labelKey(other.label) === labelKey(o.label) && sameGrams(other.gramsPerUnit, o.gramsPerUnit)) === i,
  );
  return unique.map((o) =>
    unique.filter((other) => labelKey(other.label) === labelKey(o.label)).length > 1
      ? { ...o, displayLabel: `${o.label} \u00B7 ${trimNumber(o.gramsPerUnit, 1)} g` }
      : o,
  );
}

/**
 * Units for a food: its portions, grams and ounces, and ml / cup / tbsp / tsp / fl oz ONLY when the
 * food has a known density (g/ml).
 */
export function buildServingOptions(
  portions: FoodPortion[],
  densityGPerMl: number | null,
  imperial = false,
): ServingOption[] {
  const options: ServingOption[] = portions.map((p) => ({
    key: `p:${p.id}`,
    label: p.unitLabel,
    gramsPerUnit: p.gramsPerUnit,
    kind: 'portion',
    defaultAmount: p.defaultAmount,
  }));

  const grams: ServingOption = { key: 'g', label: 'g', gramsPerUnit: 1, kind: 'mass', defaultAmount: 100 };
  const ounces: ServingOption = { key: 'oz', label: 'oz', gramsPerUnit: G_PER_OZ, kind: 'mass', defaultAmount: 1 };
  // Some sources already ship "100 g" / "1 oz" portions: do not list them twice.
  const have = new Set(options.map((o) => o.label.toLowerCase()));
  options.push(...(imperial ? [ounces, grams] : [grams, ounces]).filter((o) => !have.has(o.label)));

  if (densityGPerMl && densityGPerMl > 0) {
    const taken = new Set(options.map((o) => o.label.toLowerCase()));
    const volume: { key: string; label: string; ml: number; amount: number }[] = [
      { key: 'ml', label: 'ml', ml: 1, amount: 100 },
      { key: 'cup', label: 'cup', ml: convertVolume(1, 'cup', 'ml'), amount: 1 },
      { key: 'tbsp', label: 'tbsp', ml: convertVolume(1, 'tbsp', 'ml'), amount: 1 },
      { key: 'tsp', label: 'tsp', ml: convertVolume(1, 'tsp', 'ml'), amount: 1 },
      { key: 'fl_oz', label: 'fl oz', ml: convertVolume(1, 'fl_oz', 'ml'), amount: 1 },
    ];
    for (const v of volume) {
      if (taken.has(v.label)) continue;
      options.push({
        key: `v:${v.key}`,
        label: v.label,
        gramsPerUnit: gramsFromVolume(v.ml, densityGPerMl),
        kind: 'volume',
        defaultAmount: v.amount,
      });
    }
  }
  return nameUnits(options);
}

/** True for the gram option (the synthetic 'g' one, or a portion that is literally 1 g). */
export function isGramOption(o: Pick<ServingOption, 'key' | 'label' | 'gramsPerUnit'>): boolean {
  return o.key === 'g' || (o.label.toLowerCase() === 'g' && Math.abs(o.gramsPerUnit - 1) < 1e-6);
}

/** A non-blocking warning about an implausible amount. */
export interface AmountWarning {
  /** e.g. "That is 34.8 kg - did you mean grams?" */
  message: string;
  /** The typed number when reading it as grams would be plausible (offer a one-tap switch), else null. */
  gramsAlternative: number | null;
}

/**
 * Warns when ONE amount is implausible (more than 5 kg or 5000 kcal; see `implausibleAmount` in @ration/core),
 * typically a portion unit combined with a number meant as grams (200 x "breast (174 g)" = 34.8 kg).
 *
 * @param grams    resulting mass
 * @param kcal     resulting energy, when known
 * @param amount   the number the user typed
 * @param inGrams  whether the selected unit already is grams (then there is no alternative to offer)
 */
export function amountWarning(args: {
  grams: number | null;
  kcal?: number | undefined;
  amount: number | null;
  inGrams: boolean;
}): AmountWarning | null {
  const { grams, kcal, amount, inGrams } = args;
  if (grams === null) return null;
  const kind = implausibleAmount(grams, kcal);
  if (kind === null) return null;
  const what = kind === 'mass' ? `${trimNumber(grams / 1000, 1)} kg` : `${formatKcal(kcal)} kcal`;
  let alternative: number | null = null;
  if (!inGrams && amount !== null && amount > 0) {
    const altKcal = kcal !== undefined && grams > 0 ? (kcal / grams) * amount : undefined;
    if (implausibleAmount(amount, altKcal) === null) alternative = amount;
  }
  return {
    message: alternative !== null ? `That is ${what} - did you mean grams?` : `That is ${what} - please check the amount.`,
    gramsAlternative: alternative,
  };
}

interface InitialServing {
  /** Prefill by total grams (e.g. editing a diary entry). */
  grams?: number;
  /** Portion label to preselect (matches unit label, row label or key). */
  portion?: string;
}

function initialChoice(options: ServingOption[], initial?: InitialServing): { key: string; amount: number } {
  const byPortion = initial?.portion
    ? options.find((o) => {
        const wanted = initial.portion?.trim().toLowerCase();
        return o.key === initial.portion || o.label.toLowerCase() === wanted;
      })
    : undefined;
  if (byPortion) {
    const amount =
      initial?.grams && initial.grams > 0 ? initial.grams / byPortion.gramsPerUnit : byPortion.defaultAmount;
    return { key: byPortion.key, amount };
  }
  if (initial?.grams && initial.grams > 0) {
    const g = options.find(isGramOption);
    if (g) return { key: g.key, amount: initial.grams };
  }
  const first =
    options.find((o) => o.kind === 'portion') ?? options.find((o) => o.key === 'g') ?? options[0];
  return { key: first?.key ?? 'g', amount: first?.defaultAmount ?? 100 };
}

/**
 * State for an amount + unit pair that converts to grams. Choosing another unit keeps a number the
 * user typed but replaces an untouched default with the new unit's default.
 */
export function useServing(options: ServingOption[], initial?: InitialServing) {
  const [state, setState] = useState(() => {
    const c = initialChoice(options, initial);
    return { key: c.key, amountText: trimNumber(c.amount), touched: false };
  });

  const selected = options.find((o) => o.key === state.key) ?? options[0];
  const amount = parseNumber(state.amountText);
  const grams = selected && amount !== null && amount > 0 ? amount * selected.gramsPerUnit : null;

  return {
    selected,
    amount,
    amountText: state.amountText,
    grams,
    setAmountText: (text: string) => setState((s) => ({ ...s, amountText: text, touched: true })),
    /** Reads the number that is already typed in `opt` instead (e.g. "200" meant as grams, not as 200 portions). */
    reinterpret: (opt: ServingOption) => setState((s) => ({ key: opt.key, amountText: s.amountText, touched: true })),
    select: (opt: ServingOption) =>
      setState((s) => ({
        key: opt.key,
        amountText: s.touched ? s.amountText : trimNumber(opt.defaultAmount),
        touched: s.touched,
      })),
  };
}
