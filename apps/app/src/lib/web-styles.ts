import { Platform } from 'react-native';

import { DEFAULT_LIGHT } from '@/theme/palettes';

/**
 * Web only: replaces the browser's default focus rectangle on text fields.
 *
 * Chrome/Safari draw a square outline around the <input> itself, which looks wrong on our rounded fields and, worse, shows a box
 * *inside* the rounded search pill (the pill owns the border, the input only sits in it). So the outline is turned off and the
 * focus is shown through the border colour of whatever owns the border:
 *   - an input with its own border (text fields, notes, sign-in, chat box)  -> the input's border takes the primary colour;
 *   - an input inside a bordered wrapper (search pills)                      -> the wrapper's border takes the primary colour.
 * Keyboard users still see exactly which field is active.
 *
 * The primary colour is the CSS variable `--ct-primary`, which theme/chrome.ts sets on the root element whenever the palette
 * changes (the fallback only shows if that has not run yet).
 */
const PRIMARY = `var(--ct-primary, ${DEFAULT_LIGHT.colors.primary})`;
const CSS = `
input, textarea { outline: none !important; }
input:focus, textarea:focus { border-color: ${PRIMARY} !important; }
div:has(> input:focus), div:has(> textarea:focus) { border-color: ${PRIMARY} !important; }

/* Mobile platform tells (verified on the phone preview; some only reproducible on hardware):
   - no grey flash over the designed press feedback (the opacity dips are the feedback);
   - no pull-to-refresh or rubber band on the page itself - the app owns its scrolling;
   - no font inflation in landscape;
   - controls do not select their label on long-press, and taps fire immediately (no double-tap wait). */
html {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  overscroll-behavior: none;
  /* The dynamic viewport, so the bottom tab bar tracks the URL bar instead of hiding under it. */
  height: 100dvh;
}
button, [role="button"] {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
/* iOS Safari zooms the page when focus lands on an input under 16px. Touch screens only, so the
   desktop keeps the designed field sizes; the (never disable zoom) fix is the font size. */
@media (pointer: coarse) {
  input, textarea, select { font-size: 16px; }
}
`;

if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('cal-web-styles')) {
  const style = document.createElement('style');
  style.id = 'cal-web-styles';
  style.textContent = CSS;
  document.head.appendChild(style);

  // Expo's exported index.html ships its default viewport meta; without `viewport-fit=cover` the safe-area
  // insets are 0 on iPhone browsers and the bottom bar letterboxes under the home indicator. Patched once
  // here (the tag is in the static HTML before any module runs), in the spirit of theme/chrome.ts: the page
  // chrome outside the React tree. `interactive-widget=resizes-content` lets the Android keyboard shrink the
  // layout, so bottom-pinned UI reacts to it.
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, interactive-widget=resizes-content',
    );
  }
}
