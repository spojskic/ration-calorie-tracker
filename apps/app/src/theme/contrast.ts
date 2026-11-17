// Pure (no React Native imports): WCAG contrast maths. Used to derive the `on*` colours of a palette and by the
// palette unit tests (tools/ui-smoke/src/theme.test.ts).

/** `#RRGGBB` (6 digits, the only form palettes use) to 0-255 channels. Throws on anything else. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!m) throw new Error(`not a #RRGGBB colour: ${hex}`);
  return [parseInt(m[1] as string, 16), parseInt(m[2] as string, 16), parseInt(m[3] as string, 16)];
}

const channel = (v: number): number => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). Symmetric. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The best foreground for text or an icon on `background`: the candidate with the highest contrast (the first one wins a
 * tie). When even the best candidate stays under `minRatio`, plain black or white takes over (one of them always reaches
 * 4.5:1 on any colour).
 */
export function bestInk(background: string, candidates: readonly string[], minRatio = 4.5): string {
  let best = candidates[0] ?? '#000000';
  let bestRatio = -1;
  for (const candidate of candidates) {
    const ratio = contrastRatio(background, candidate);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  if (bestRatio >= minRatio) return best;
  return contrastRatio(background, '#000000') >= contrastRatio(background, '#FFFFFF') ? '#000000' : '#FFFFFF';
}

/** Hue (0-1, red at 0), saturation and lightness (both 0-1) of a `#RRGGBB` colour. */
function rgbToHsl(hex: string): [number, number, number] {
  const [r255, g255, b255] = hexToRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const chroma = max - min;
  if (chroma === 0) return [0, 0, l];
  const s = l > 0.5 ? chroma / (2 - max - min) : chroma / (max + min);
  const hue =
    max === r ? (g - b) / chroma + (g < b ? 6 : 0) : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  return [hue / 6, s, l];
}

/** The inverse of {@link rgbToHsl}, as `#RRGGBB` (uppercase, the form every palette uses). */
function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number): number => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channels = [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
  return `#${channels.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * A text-safe version of `color` for the `backgrounds` it is drawn on: the same hue and saturation, darkened on a light
 * page (or lightened on a dark one) only as far as the first lightness step that reaches `minRatio` everywhere.
 *
 * Why derive instead of picking: the status and accent colours are chosen to read as bars, rings and icons (3 : 1 UI), and
 * at 11-16 px they land between 2.6 and 4.4 : 1 on the card colours. Hand-tuning one variant per palette would mean
 * re-checking 22 palettes by hand every time a colour changes; this keeps the floors true by construction. A colour that
 * already passes is returned untouched, so a palette only changes where it actually failed.
 */
export function textSafe(color: string, backgrounds: readonly string[], minRatio = 4.5): string {
  const passes = (hex: string): boolean => backgrounds.every((bg) => contrastRatio(hex, bg) >= minRatio);
  if (backgrounds.length === 0 || passes(color)) return color;

  const [h, s, l] = rgbToHsl(color);
  // The page decides the direction: lighten the ink on a dark one, darken it on a light one. The average is enough because a
  // palette's page, card and inset never straddle mid grey.
  const lighten = backgrounds.reduce((sum, bg) => sum + relativeLuminance(bg), 0) / backgrounds.length < 0.5;
  const STEP = 0.005;
  for (let i = 1; i <= 200; i += 1) {
    const next = lighten ? Math.min(1, l + i * STEP) : Math.max(0, l - i * STEP);
    const hex = hslToHex(h, s, next);
    if (passes(hex)) return hex;
  }
  // No lightness of this hue reaches the floor (a mid-grey background, which no palette has): plain black or white, the
  // one with the better worst case, is the only honest answer.
  const worst = (fg: string): number => Math.min(...backgrounds.map((bg) => contrastRatio(fg, bg)));
  return worst('#000000') >= worst('#FFFFFF') ? '#000000' : '#FFFFFF';
}
