/**
 * Shared press-feedback values so every tappable in the app dips by the same amount. The dip is instant
 * (no timing): it is feedback, not animation, which keeps it correct on the highest-frequency surfaces
 * (tab bar, list rows). Scale, where used, lives with the component that owns the animation.
 */

/** How far a pressed tappable dims. One value across the app — inconsistent dips read as sloppiness. */
export const PRESSED_DIP = 0.7;

/** The opacity dip for a `Pressable` style function: `style={({ pressed }) => [base, pressedDip(pressed)]}`. */
export function pressedDip(pressed: boolean): { opacity: number } {
  return { opacity: pressed ? PRESSED_DIP : 1 };
}
