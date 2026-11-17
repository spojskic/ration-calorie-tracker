// Pure (no React Native imports): builds a complete `ThemeColors` from the hand-picked part of a palette.
import { bestInk, textSafe } from './contrast';
import type { ThemeColors } from './colors';

/**
 * The colours a palette author chooses. The `on*` text colours, the text-grade status/accent variants and the scrim are
 * derived, see {@link defineColors}.
 */
export type BaseColors = Omit<
  ThemeColors,
  'onPrimary' | 'onDanger' | 'onWarning' | 'onSuccess' | 'successText' | 'dangerText' | 'accentText' | 'onSidebarPrimary' | 'scrim'
>;

/** The palette's own darkest and lightest text colours (used on top of bright or dark fills). */
export interface Ink {
  dark: string;
  light: string;
}

/** WCAG AA for body-sized text: the floor the derived text tokens are held to on every flat surface of a palette. */
const TEXT_FLOOR = 4.5;

/**
 * Completes a palette: every `on*` colour is whichever of the two inks reads best on its fill (plain black or white when
 * neither reaches 4.5:1), and the scrim is the dark ink (drawn at partial opacity behind sheets, see `withAlpha`).
 *
 * The `*Text` tokens are the graphic colours shifted to a lightness that reaches 4.5:1 on the page, the card and the inset
 * (`textSafe`, contrast.ts). The graphic tokens stay as they are: a bar fill or a ring stroke is a 3 : 1 UI part and keeps
 * its published colour, while the same hue used as an 11-16 px label has to pass as text. The tab bar is its own case: it is
 * a dark strip in some light palettes (Ration Day), so `onSidebarPrimary` is tuned against `sidebar` alone rather than the
 * page surfaces - one colour cannot be dark enough for a light page and light enough for a dark bar.
 */
export function defineColors(base: BaseColors, ink: Ink): ThemeColors {
  const on = (fill: string) => bestInk(fill, [ink.dark, ink.light]);
  const surfaces = [base.background, base.surface, base.surfaceAlt];
  return {
    ...base,
    onPrimary: on(base.primary),
    onDanger: on(base.danger),
    onWarning: on(base.warning),
    onSuccess: on(base.success),
    successText: textSafe(base.success, surfaces, TEXT_FLOOR),
    dangerText: textSafe(base.danger, surfaces, TEXT_FLOOR),
    accentText: textSafe(base.accent, surfaces, TEXT_FLOOR),
    onSidebarPrimary: textSafe(base.primary, [base.sidebar], TEXT_FLOOR),
    scrim: ink.dark,
  };
}
