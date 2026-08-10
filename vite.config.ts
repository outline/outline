import path from "node:path";
import react from "@vitejs/plugin-react";
import browserslistToEsbuild from "browserslist-to-esbuild";
import webpackStats from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
const NODE_ENV = process.env.NODE_ENV || "development";
const CDN_URL = process.env.CDN_URL ?? "";
const URL_ENV = process.env.URL || "http://localhost:3001";

let host: string | undefined;

if (NODE_ENV === "development") {
  try {
    host = new URL(URL_ENV).hostname;
  } catch (_err) {
    host = "localhost";
  }
}

export default () =>
  defineConfig({
    root: "./",
    publicDir: "./public",
    base: (CDN_URL ?? "") + "/static/",
    server: {
      port: 3001,
      host: true,
      allowedHosts: host ? [host] : undefined,
      cors: true,
      fs:
        NODE_ENV === "development"
          ? {
              // Allow serving files from one level up to the project root
              allow: [".."],
            }
          : { strict: true },
    },
    plugins: [
      react(),
      // https://vite-pwa-org.netlify.app/
      VitePWA({
        injectRegister: "inline",
        registerType: "autoUpdate",
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ["**/*.{js,css,ico,png,svg}"],
          navigateFallback: null,
          modifyURLPrefix: {
            "": `${CDN_URL ?? ""}/static/`,
          },
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /api\/urls\.unfurl$/,
              handler: "CacheOnly",
              options: {
                cacheName: "unfurl-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /api\/files\.get/,
              handler: "CacheFirst",
              options: {
                cacheName: "files-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 604800, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200, 206], // Include partial content for range requests
                },
                rangeRequests: true, // Allow range requests for partial content
              },
            },
          ],
        },
        manifest: {
          name: "Outline",
          short_name: "Outline",
          theme_color: "#fff",
          background_color: "#fff",
          start_url: "/",
          scope: ".",
          display: "standalone",
          // For Chrome, you must provide at least a 192x192 pixel icon, and a 512x512 pixel icon.
          // If only those two icon sizes are provided, Chrome will automatically scale the icons
          // to fit the device. If you'd prefer to scale your own icons, and adjust them for
          // pixel-perfection, provide icons in increments of 48dp.
          icons: [
            {
              src: "/images/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/images/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/images/icon-maskable-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/images/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/images/icon-maskable-1024.png",
              sizes: "1024x1024",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/images/icon-monochrome-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "monochrome",
            },
            {
              src: "/images/icon-monochrome-1024.png",
              sizes: "1024x1024",
              type: "image/png",
              purpose: "monochrome",
            },
          ],
        },
      }),
      // Generate a stats.json file for webpack that will be consumed by RelativeCI
      webpackStats(),
    ],
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./app"),
        "@shared": path.resolve(__dirname, "./shared"),
      },
    },
    build: {
      outDir: "./build/app",
      manifest: true,
      sourcemap: process.env.CI ? false : "hidden",
      minify: "oxc",
      // Prevent asset inlining as it does not conform to CSP rules
      assetsInlineLimit: 0,
      target: browserslistToEsbuild(),
      reportCompressedSize: false,
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress noisy warnings about module-level directives, e.g. "use client"
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
            return;
          }
          warn(warning);
        },
        input: {
          index: "./app/index.tsx",
        },
        output: {
          assetFileNames: "assets/[name].[hash][extname]",
          chunkFileNames: "assets/[name].[hash].js",
          entryFileNames: "assets/[name].[hash].js",
          codeSplitting: {
            groups: [
              // Shared utilities used across the app — higher priority
              // prevents them being absorbed into lazy vendor chunks
              {
                name: "vendor-shared",
                test: /node_modules[\\/]uuid|vite[\\/]preload-helper/,
                priority: 30,
              },
              {
                name: "vendor-react",
                test: /node_modules[\\/](react|react-dom|scheduler|react-router)/,
                priority: 20,
              },
              {
                name: "vendor-prosemirror",
                test: /node_modules[\\/](@benrbray[\\/])?prosemirror/,
                priority: 20,
              },
              {
                name: "vendor-collab",
                test: /node_modules[\\/](yjs|y-prosemirror|y-indexeddb|@hocuspocus|lib0)/,
                priority: 20,
              },
              {
                name: "vendor-framer-motion",
                test: /node_modules[\\/]framer-motion/,
                priority: 20,
              },
              {
                name: "vendor-styled",
                test: /node_modules[\\/]styled-components/,
                priority: 20,
              },
              {
                name: "vendor-mermaid-elk",
                test: /node_modules[\\/](@mermaid-js[\\/]layout-elk|elkjs)/,
                priority: 25,
              },
              {
                name: "vendor-mermaid",
                test: /node_modules[\\/](mermaid|cytoscape|cytoscape-fcose|layout-base|dagre-d3-es|langium|chevrotain|roughjs|@mermaid-js)/,
                priority: 20,
              },
              {
                name: "vendor-katex",
                test: /node_modules[\\/]katex/,
                priority: 20,
              },
              {
                name: "vendor-emoji",
                test: /node_modules[\\/](@emoji-mart|emoji-mart)/,
                priority: 20,
              },
              {
                name: "vendor-es-toolkit",
                test: /node_modules[\\/]es-toolkit/,
                priority: 20,
              },
              {
                name: "vendor-date",
                test: /node_modules[\\/]date-fns/,
                priority: 20,
              },
              {
                name: "vendor-sentry",
                test: /node_modules[\\/]@sentry/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
  });
