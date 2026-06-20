import type { ThemeDefinition } from "../core";

export const lightBrew: ThemeDefinition = {
  id: "light-brew",
  name: "Light Brew",
  mode: "light",
  preview: "./lightBrew.png",
  colors: {
    canvas: "#efe6d2",
    surface: "#faf4e6",
    surfaceMuted: "#e7ddc7",
    sidebar: "#e5dcc8",
    header: "#d9ccb2",
    text: "#2f2a24",
    textMuted: "#6f655b",
    accent: "#8b5e3c",
    border: "#d2c5ad",
    codeBackground: "#e8deca",
    tableHeader: "#e2d5bd",
    calloutBackground: "#f1e8d6",
  },
  typography: {
    ui: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    content: "Georgia, Times New Roman, serif",
    mono: "SFMono-Regular, Consolas, Liberation Mono, monospace",
  },
  layout: {
    density: 1.02,
    contentWidth: "72ch",
    sidebarWidth: "280px",
    radius: "4px",
  },
};
