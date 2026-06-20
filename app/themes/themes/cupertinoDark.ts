import type { ThemeDefinition } from "../core";

export const cupertinoDark: ThemeDefinition = {
  id: "cupertino-dark",
  name: "Cupertino Dark",
  mode: "dark",
  preview: "./cupertinoDark.png",
  colors: {
    canvas: "#111113",
    surface: "#1c1c1e",
    surfaceMuted: "#242426",
    sidebar: "#18181a",
    header: "#111113",
    text: "#f5f5f7",
    textMuted: "#a1a1a6",
    accent: "#0a84ff",
    border: "#38383a",
    codeBackground: "#151517",
    tableHeader: "#2a2a2c",
    calloutBackground: "#202022"
  },
  typography: {
    ui: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, sans-serif",
    content: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  },
  layout: { density: 0.94, contentWidth: "740px", sidebarWidth: "264px", radius: "10px" }
};
