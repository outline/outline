import { darken, lighten, readableColor, transparentize } from "polished";
import type { DefaultTheme } from "styled-components";
import type { ThemeDefinition } from "./types";

/**
 * Maps a custom {@link ThemeDefinition} onto Outline's full styled-components
 * `DefaultTheme`, composing the explicit palette over an already-resolved base
 * theme.
 *
 * The base theme is produced upstream by `useBuildTheme`, so device- and
 * media-specific handling (mobile pitch-black, print-force-light) is preserved:
 * only the enumerated visible-surface keys below are overridden. Keys that are
 * intentionally NOT mapped — syntax-highlight (`code*`) colors, notice/callout
 * (`notice*`) colors, shadows, and diff colors — inherit the base theme for v1.
 *
 * The override object is checked with `satisfies Partial<DefaultTheme>`, so a
 * misspelled or non-existent key fails the type-check rather than silently
 * producing an `undefined` at runtime.
 *
 * The palette fields `header`, `tableHeader`, and `calloutBackground` are
 * reserved for a future revision — Outline has no single clean `DefaultTheme`
 * target for them yet — and are intentionally not applied here.
 *
 * Fails safe: if a palette value is malformed and a `polished` transform throws,
 * the unmodified base theme is returned so the app never fails to render.
 *
 * @param def the custom theme definition to apply.
 * @param base the resolved base theme to compose over (from `useBuildTheme`).
 * @returns a complete `DefaultTheme` with the palette applied, or `base` on error.
 */
export function buildThemeFromDefinition(
  def: ThemeDefinition,
  base: DefaultTheme
): DefaultTheme {
  const { colors: c, typography: t } = def;
  const isDark = def.mode === "dark";

  // Raise a surface away from its base (lighter on dark themes, darker on
  // light) — used for hover/active/elevated states.
  const raise = (amount: number, color: string) =>
    isDark ? lighten(amount, color) : darken(amount, color);

  // Dim a foreground toward the background (darker on dark themes, lighter on
  // light) — used for progressively subtler text.
  const dim = (amount: number, color: string) =>
    isDark ? darken(amount, color) : lighten(amount, color);

  try {
    const overrides = {
      isDark,

      // Background layers
      background: c.canvas,
      backgroundSecondary: c.surface,
      backgroundTertiary: c.surfaceMuted,
      backgroundQuaternary: raise(0.05, c.surfaceMuted),

      // Text layers
      text: c.text,
      cursor: c.text,
      textSecondary: c.textMuted,
      textTertiary: dim(0.12, c.textMuted),
      placeholder: c.textMuted,

      // Accent, links, selection
      accent: c.accent,
      accentText: readableColor(c.accent),
      link: c.accent,
      selected: c.accent,
      tableSelected: c.accent,
      tableSelectedBackground: transparentize(0.9, c.accent),
      inputBorderFocused: c.accent,

      // Sidebar
      sidebarBackground: c.sidebar,
      sidebarText: c.textMuted,
      sidebarHoverBackground: raise(0.05, c.sidebar),
      sidebarActiveBackground: raise(0.09, c.sidebar),
      sidebarControlHoverBackground: transparentize(0.8, c.text),
      sidebarDraftBorder: raise(0.2, c.sidebar),

      // Borders, dividers, rules
      divider: c.border,
      titleBarDivider: c.border,
      inputBorder: c.border,
      codeBorder: c.border,
      embedBorder: c.border,
      horizontalRule: c.border,
      quote: c.border,
      progressBarBackground: c.border,
      scrollbarThumb: c.border,

      // Elevated surfaces: inputs, lists, menus, modals, toasts, buttons, tooltips
      inputBackground: c.surfaceMuted,
      listItemHoverBackground: c.surfaceMuted,
      mentionBackground: c.surfaceMuted,
      mentionHoverBackground: c.surface,
      menuBackground: c.surface,
      menuItemSelected: c.surfaceMuted,
      modalBackground: c.surface,
      toastBackground: c.surface,
      toastText: c.text,
      buttonNeutralBackground: c.surface,
      buttonNeutralText: c.text,
      buttonNeutralBorder: c.border,
      tooltipBackground: c.text,
      tooltipText: c.canvas,
      scrollbarBackground: c.surfaceMuted,

      // Code surface (syntax-highlight token colors intentionally inherit base)
      codeBackground: c.codeBackground,

      // Typography (content/serif font deferred to CSS custom props in v1.1)
      fontFamily: t.ui,
      fontFamilyMono: t.mono,
    } satisfies Partial<DefaultTheme>;

    return { ...base, ...overrides };
  } catch {
    return base;
  }
}
