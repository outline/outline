import type { ThemeDefinition } from "../core";

export const encyclopediaLight: ThemeDefinition = {
  id: "encyclopedia-light",
  name: "Encyclopedia Light",
  mode: "light",
  preview: "./encyclopediaLight.png",
  colors: {
    canvas: "#f8f9fa",
    surface: "#ffffff",
    surfaceMuted: "#f1f3f5",
    sidebar: "#f6f6f6",
    header: "#ffffff",
    text: "#202122",
    textMuted: "#54595d",
    accent: "#3366cc",
    border: "#a2a9b1",
    codeBackground: "#f8f9fa",
    tableHeader: "#eaecf0",
    calloutBackground: "#f8f9fa",
  },
  typography: {
    ui: "Arial, Helvetica, sans-serif",
    content: "Linux Libertine, Georgia, Times New Roman, serif",
    mono: "Menlo, Consolas, Liberation Mono, monospace",
  },
  layout: {
    density: 0.9,
    contentWidth: "80ch",
    sidebarWidth: "272px",
    radius: "2px",
  },
};
