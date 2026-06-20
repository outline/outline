import type { ThemeDefinition } from "../core";

export const notationPaper: ThemeDefinition = {
  id: "notation-paper",
  name: "Notation Paper",
  mode: "light",
  preview: "./notationPaper.png",
  colors: {
    canvas: "#f7f6f3",
    surface: "#ffffff",
    surfaceMuted: "#f1f1ef",
    sidebar: "#f3f3f1",
    header: "#ffffff",
    text: "#37352f",
    textMuted: "#787774",
    accent: "#2f76c0",
    border: "#e2e2df",
    codeBackground: "#f1f1ef",
    tableHeader: "#eeeeec",
    calloutBackground: "#f7f7f5",
  },
  typography: {
    ui: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    content: "Georgia, Times New Roman, serif",
    mono: "SFMono-Regular, Consolas, Liberation Mono, monospace",
  },
  layout: {
    density: 0.96,
    contentWidth: "760px",
    sidebarWidth: "260px",
    radius: "3px",
  },
};
