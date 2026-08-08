import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  server: {
    port: 3001,
    host: true,
  },
  vite: {
    resolve: {
      alias: {
        "~": "/app",
        "@shared": "/shared",
        "plugins": "/plugins",
      },
    },
  },
});
