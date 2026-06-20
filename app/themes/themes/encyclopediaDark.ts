import type { ThemeDefinition } from "../core";

export const encyclopediaDark: ThemeDefinition = {
  id: "encyclopedia-dark",
  name: "Encyclopedia Dark",
  mode: "dark",
  preview: "./encyclopediaDark.png",
  colors: {
    canvas: "#101418",
    surface: "#181d22",
    surfaceMuted: "#20262c",
    sidebar: "#14191e",
    header: "#101418",
    text: "#eaecf0",
    textMuted: "#a2a9b1",
    accent: "#88aaff",
    border: "#4a5058",
    codeBackground: "#11161b",
    tableHeader: "#252b31",
    calloutBackground: "#1c2228"
  },
  typography: {
    ui: "Arial, Helvetica, sans-serif",
    content: "Linux Libertine, Georgia, Times New Roman, serif",
    mono: "Menlo, Consolas, Liberation Mono, monospace"
  },
  layout: { density: 0.9, contentWidth: "80ch", sidebarWidth: "272px", radius: "2px" }
};
