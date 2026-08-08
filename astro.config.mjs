import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [react()],
  server: {
    port: 3001,
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      modulePreload: false,
    },
    resolve: {
      alias: {
        "~": "/app",
        "@shared": "/shared",
        "plugins": "/plugins",
      },
    },
  },
});

