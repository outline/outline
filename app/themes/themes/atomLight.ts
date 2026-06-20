import type { ThemeDefinition } from "../core";

export const atomLight: ThemeDefinition = {
  id: "atom-light",
  name: "Atom-Light",
  mode: "light",
  preview: "./atomLight.png",
  colors: {
    canvas: "#fafafa",
    surface: "#ffffff",
    surfaceMuted: "#f0f0f0",
    sidebar: "#f3f3f3",
    header: "#ffffff",
    text: "#383a42",
    textMuted: "#696c77",
    accent: "#4078f2",
    border: "#d7d7d7",
    codeBackground: "#f3f3f3",
    tableHeader: "#e9e9e9",
    calloutBackground: "#f6f6f6",
  },
  typography: {
    ui: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    content: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    mono: "SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace",
  },
  layout: {
    density: 0.92,
    contentWidth: "760px",
    sidebarWidth: "260px",
    radius: "4px",
  },
};
