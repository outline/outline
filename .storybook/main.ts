import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../app/stories/**/*.stories.tsx"],
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: { viteConfigPath: ".storybook/vite.config.ts" },
    },
  },
  viteFinal: async (config) => {
    const tailwindcss = (await import("@tailwindcss/vite")).default;

    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "~": "/app",
        "@shared": "/shared",
        plugins: "/plugins",
      },
    };

    return config;
  },
};

export default config;
