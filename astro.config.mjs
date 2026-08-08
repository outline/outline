import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const PAGES_DIR = "src/pages";

/**
 * Lists the routes that `src/pages` serves itself, so the SPA fallback leaves
 * them alone. Dynamic segments are skipped – those are the catch-all the
 * fallback exists to stand in for.
 *
 * @returns the set of concrete Astro route paths.
 */
function astroRoutes() {
  const routes = new Set(["/"]);

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(astro|md|mdx|html)$/.test(entry.name)) {
        continue;
      }
      const route = relative(PAGES_DIR, full)
        .replace(/\.(astro|md|mdx|html)$/, "")
        .split(sep)
        .join("/")
        .replace(/(^|\/)index$/, "");
      if (!route.includes("[")) {
        routes.add(`/${route}`.replace(/\/$/, "") || "/");
      }
    }
  };

  try {
    walk(PAGES_DIR);
  } catch {
    // No pages directory yet; the fallback still covers the client routes.
  }

  return routes;
}

/**
 * Serves the SPA entry document for client-side routes during development.
 *
 * Astro only renders the paths enumerated in `[...slug].astro`, so a full page
 * load of a deep link such as `/collection/<slug>` would otherwise return the
 * 404 page instead of booting the app.
 *
 * Only document requests are rewritten – matching on the `text/html` accept
 * header leaves module, asset and HMR requests (notably `/__vite_ping`, which
 * triggers a reload loop when it is answered with HTML) untouched. Routes that
 * `src/pages` defines are served by Astro rather than handed to the SPA.
 */
function spaFallback() {
  const isServedDirectly = (pathname) =>
    pathname.startsWith("/@") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") ||
    astroRoutes().has(pathname.replace(/\/$/, "") || "/");

  return {
    name: "spa-fallback",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = req.url?.split("?")[0];

        if (
          req.method === "GET" &&
          pathname &&
          !isServedDirectly(pathname) &&
          req.headers.accept?.includes("text/html")
        ) {
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
        plugins: "/plugins",
      },
    },
  },
});
