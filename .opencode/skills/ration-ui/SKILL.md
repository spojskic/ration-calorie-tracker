---
name: Ration UI
description: How UI is built in the Ration Expo app — primitives, theme tokens, press feedback, haptics, desktop split. Use this skill whenever building or editing any screen, component, style or theme value in apps/app, even small tweaks. It encodes the token discipline (no literal radii — a test enforces it), the press-feedback pattern, screen composition and the things agents routinely get wrong.
---

# Ration UI

## Where the primitives live

There is no `components/ui/` directory: all base primitives are in **`apps/app/src/components/ui.tsx`**
(`AppText`, `Card`, `Screen`, `Button`, `TextField`, `Switch`, …). Feature building blocks sit beside
their feature: `pill-button.tsx`, `diary/IconButton.tsx`, `settings/rows.tsx` (NavRow, Badge, Note,
Chip, Divider), `panel.tsx` (desktop panels), `ai/AiBits.tsx` (Notice). Prefer composing these over
introducing new ones.

## Theme tokens are mandatory

- `useTheme()` returns `{ colors, isDark, corners, radius, shape }` from `apps/app/src/theme/`.
- **Never use a literal `borderRadius` ≥ 6 and never import radii statically** —
  `tools/ui-smoke/src/shape-guard.test.ts` scans all of `apps/app/src` and fails. Radii are applied
  inline (not in module-level StyleSheet) so they follow the user's corner setting. The shape system
  has two corner styles: ROUNDED (sm 8 / md 12 / lg 16 / pill 999) and BOXY (3/4/6/4, the default) —
  design must work in both; use the `shape`/`radius` helpers (`circle()`, `bar()`, `inner()`,
  `tailed()`).
- Spacing comes from `spacing` tokens (xs 4 … xxl 32); colors from palette tokens — both light and
  dark sides have multiple selectable palettes, so never hardcode a hex that exists as a token.

## Press feedback pattern

Every tappable uses `Pressable` with a style function. The house pattern is an instant opacity dip
or background swap:

```tsx
<Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} ...>
```

or `backgroundColor: pressed ? colors.surfaceAlt : 'transparent'`. Match whichever the surrounding
code uses. There are no animation/timing tokens in the theme yet — do not invent one-off animated
press states without the user asking.

Haptics are wired into specific action handlers (not generic taps) via the per-area wrappers:
`diary/haptics.ts` (`haptic('selection'|'light'|'medium'|'success'|…)`), `activity/haptics.ts`,
`food/feedback.ts`. They no-op on web. Follow the existing call-site density; don't sprinkle more.

## Screens

- Routes live in `apps/app/src/app/` (Expo Router); every file there is a screen. Use `Screen` as
  the wrapper (`scroll`, `safeTop`, `maxWidth`), `Stack.Screen options` for headers.
- The "Add to diary" screen is a `slide_from_bottom` stack screen, deliberately NOT a modal/formSheet.
- Sheets/menus are the custom `Sheet` / `ActionMenu` in `components/diary/Sheet.tsx` (RN Modal:
  bottom sheet on phones, centered dialog ≥ 900px). No bottom-sheet library — use them.
- Desktop (≥ 900px) renders a different shell: `DesktopFrame` + `Sidebar` + panels; keep interactive
  affordances working with mouse (hover states via `onHoverIn/onHoverOut`, e.g. `NavRow`).

## Accessibility + React Compiler

- Every pressable gets `accessibilityRole` and a sensible `accessibilityLabel` (the codebase is
  consistent about this — keep it).
- React Compiler is ON (enforced by ESLint): derive values during render instead of state-in-effects.
- Loading is shown with `ActivityIndicator` (centered or inline); there are no skeletons.

## Testing hooks for UI work

- Every screen under `src/app/` needs a scenario in `tools/ui-smoke/src/scenarios.ts` —
  `harness.test.ts` fails until each route file has one. See `tools/ui-smoke/README.md`
  §"Add or change a scenario"; assert input VALUES with `expectInputValue`, not `expectText`.
- After UI changes run: `npx tsc --noEmit`, `npx expo lint`, and the relevant ui-smoke scenarios
  (`node --import tsx src/run.ts -- --only=<substr>` in `tools/ui-smoke`; the Chrome run needs a
  normal terminal — inside sandboxes use `pnpm --filter @ration/ui-smoke test`).
