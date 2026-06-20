import type { ThemeDefinition } from "../core";

export const darkBrew: ThemeDefinition = {
  id: "dark-brew",
  name: "Dark Brew",
  mode: "dark",
  preview: "./darkBrew.png",
  colors: {
    canvas: "#201915",
    surface: "#2b211c",
    surfaceMuted: "#332720",
    sidebar: "#241b17",
    header: "#1b1512",
    text: "#f1e5d3",
    textMuted: "#b9aa97",
    accent: "#d49a6a",
    border: "#4a382e",
    codeBackground: "#181210",
    tableHeader: "#3a2b24",
    calloutBackground: "#30241e",
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
