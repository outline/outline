import type { ThemeDefinition } from "../core";

export const flash: ThemeDefinition = {
  id: "flash",
  name: "Flash",
  mode: "light",
  preview: "./flash.png",
  colors: {
    canvas: "#fff8e8",
    surface: "#ffffff",
    surfaceMuted: "#fff1c9",
    sidebar: "#fff4d6",
    header: "#ffe8a3",
    text: "#2e2a22",
    textMuted: "#756c5b",
    accent: "#d97706",
    border: "#ead7a5",
    codeBackground: "#fff0c7",
    tableHeader: "#f9e4aa",
    calloutBackground: "#fff5db",
  },
  typography: {
    ui: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    content: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    mono: "SFMono-Regular, Consolas, Liberation Mono, monospace",
  },
  layout: {
    density: 0.9,
    contentWidth: "760px",
    sidebarWidth: "258px",
    radius: "6px",
  },
};
