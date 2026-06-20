import type { ThemeDefinition } from "../core";

export const night: ThemeDefinition = {
  id: "night",
  name: "Night",
  mode: "dark",
  preview: "./night.png",
  colors: {
    canvas: "#16161e",
    surface: "#1a1b26",
    surfaceMuted: "#24283b",
    sidebar: "#181925",
    header: "#13131a",
    text: "#c0caf5",
    textMuted: "#9aa5ce",
    accent: "#7aa2f7",
    border: "#3b4261",
    codeBackground: "#11121a",
    tableHeader: "#292e42",
    calloutBackground: "#202436"
  },
  typography: {
    ui: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    content: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    mono: "JetBrains Mono, SFMono-Regular, Consolas, monospace"
  },
  layout: { density: 0.94, contentWidth: "760px", sidebarWidth: "270px", radius: "5px" }
};
