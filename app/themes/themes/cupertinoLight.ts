import type { ThemeDefinition } from "../core";

export const cupertinoLight: ThemeDefinition = {
  id: "cupertino-light",
  name: "Cupertino Light",
  mode: "light",
  preview: "./cupertinoLight.png",
  colors: {
    canvas: "#f5f5f7",
    surface: "#ffffff",
    surfaceMuted: "#f0f0f2",
    sidebar: "#ececf0",
    header: "#ffffff",
    text: "#1d1d1f",
    textMuted: "#6e6e73",
    accent: "#0071e3",
    border: "#d2d2d7",
    codeBackground: "#f2f2f4",
    tableHeader: "#ededf0",
    calloutBackground: "#f7f7f9",
  },
  typography: {
    ui: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, sans-serif",
    content:
      "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  layout: {
    density: 0.94,
    contentWidth: "740px",
    sidebarWidth: "264px",
    radius: "10px",
  },
};
