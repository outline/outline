/** Supported visual modes for a complete theme. */
export type ThemeMode = "light" | "dark";

/**
 * Complete user-selectable theme definition.
 *
 * All color and size values are CSS-compatible strings unless noted otherwise.
 */
export type ThemeDefinition = {
  /** Stable machine-readable identifier, e.g. "light-brew". */
  id: string;

  /** Human-readable label shown in Settings, e.g. "Light Brew". */
  name: string;

  /** Whether the theme is designed for a light or dark interface. */
  mode: ThemeMode;

  /** Imported PNG preview path used by the theme picker. */
  preview: string;

  colors: {
    /** Main application background. CSS color string. */
    canvas: string;

    /** Primary document and panel surface. CSS color string. */
    surface: string;

    /** Secondary or subdued surface. CSS color string. */
    surfaceMuted: string;

    /** Left navigation background. CSS color string. */
    sidebar: string;

    /** Header or top navigation background. CSS color string. */
    header: string;

    /** Primary readable text color. CSS color string. */
    text: string;

    /** Secondary text and metadata color. CSS color string. */
    textMuted: string;

    /** Interactive, link, and selected-state color. CSS color string. */
    accent: string;

    /** Default divider and control border color. CSS color string. */
    border: string;

    /** Inline and block code background. CSS color string. */
    codeBackground: string;

    /** Table heading-row background. CSS color string. */
    tableHeader: string;

    /** Default callout or notice background. CSS color string. */
    calloutBackground: string;
  };

  typography: {
    /** Interface font-family stack for navigation and controls. */
    ui: string;

    /** Content font-family stack for document text. */
    content: string;

    /** Monospace font-family stack for code and technical text. */
    mono: string;
  };

  layout: {
    /** Unitless spacing multiplier; 1 preserves the baseline density. */
    density: number;

    /** Maximum document width, e.g. "760px" or "70ch". */
    contentWidth: string;

    /** Navigation sidebar width, e.g. "280px". */
    sidebarWidth: string;

    /** Shared corner radius, e.g. "6px". */
    radius: string;
  };
};
