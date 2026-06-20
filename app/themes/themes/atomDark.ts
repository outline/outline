import type { ThemeDefinition } from "../core";

export const atomDark: ThemeDefinition = {
  id: "atom-dark",
  name: "Atom-Dark",
  mode: "dark",
  preview: "./atomDark.png",
  colors: {
    canvas: "#21252b",
    surface: "#282c34",
    surfaceMuted: "#2c313a",
    sidebar: "#21252b",
    header: "#1d2025",
    text: "#abb2bf",
    textMuted: "#7f848e",
    accent: "#61afef",
    border: "#3e4451",
    codeBackground: "#1d2025",
    tableHeader: "#30353e",
    calloutBackground: "#2b3038",
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
