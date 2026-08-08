import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

function spaFallback() {
  return {
    name: "spa-fallback",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && !req.url.includes(".") && !req.url.startsWith("/@") && !req.url.startsWith("/api/")) {
          req.url = "/";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  integrations: [react()],
  server: {
    port: 3001,
    host: true,
  },
  vite: {
    plugins: [tailwindcss(), spaFallback()],
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

