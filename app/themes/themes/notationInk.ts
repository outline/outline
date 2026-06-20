import type { ThemeDefinition } from "../core";

export const notationInk: ThemeDefinition = {
  id: "notation-ink",
  name: "Notation Ink",
  mode: "dark",
  preview: "./notationInk.png",
  colors: {
    canvas: "#191919",
    surface: "#202020",
    surfaceMuted: "#262626",
    sidebar: "#1f1f1f",
    header: "#191919",
    text: "#ebebeb",
    textMuted: "#a3a3a3",
    accent: "#529cca",
    border: "#333333",
    codeBackground: "#161616",
    tableHeader: "#292929",
    calloutBackground: "#242424"
  },
  typography: {
    ui: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    content: "Georgia, Times New Roman, serif",
    mono: "SFMono-Regular, Consolas, Liberation Mono, monospace"
  },
  layout: { density: 0.96, contentWidth: "760px", sidebarWidth: "260px", radius: "3px" }
};
