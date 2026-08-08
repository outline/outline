import type { Preview } from "@storybook/react";
import "../src/styles/global.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    options: {
      storySort: { order: ["Application UI", "Marketing", "Ecommerce"] },
    },
  },
};

export default preview;
