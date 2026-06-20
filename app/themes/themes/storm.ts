import type { ThemeDefinition } from "../core";

export const storm: ThemeDefinition = {
  id: "storm",
  name: "Storm",
  mode: "light",
  preview: "./storm.png",
  colors: {
    canvas: "#dfe5f2",
    surface: "#eef1f8",
    surfaceMuted: "#d7deed",
    sidebar: "#d5dceb",
    header: "#cbd4e6",
    text: "#343b58",
    textMuted: "#6b7394",
    accent: "#34548a",
    border: "#b9c2d6",
    codeBackground: "#d8deeb",
    tableHeader: "#cfd7e7",
    calloutBackground: "#e3e8f3",
  },
  typography: {
    ui: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    content: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    mono: "JetBrains Mono, SFMono-Regular, Consolas, monospace",
  },
  layout: {
    density: 0.94,
    contentWidth: "760px",
    sidebarWidth: "270px",
    radius: "5px",
  },
};
