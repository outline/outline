import path from "path";
import react from "@vitejs/plugin-react";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: "./",
  publicDir: "./server/static",
  server: {
    port: 3001,
  },
  plugins: [
    // https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#readme
    react({
      babel: {
        babelrc: true,
        presets: [
          "@babel/preset-react",
          "@babel/preset-typescript",
          [
            "@babel/preset-env",
            {
              corejs: {
                version: "3",
                proposals: true,
              },
              useBuiltIns: "usage",
              exclude: [
                "transform-modules-commonjs",
                "proposal-dynamic-import",
              ],
            },
          ],
        ],
      },
    }),
    // https://vite-pwa-org.netlify.app/
    VitePWA({
      injectRegister: "script",
      registerType: "autoUpdate",
      // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: "Outline",
        short_name: "Outline",
        // description: "My Awesome App description",
        theme_color: "#fff",
        background_color: "#fff",
        start_url: "/",
        publicPath: "/static/",
        display: "standalone",
        // For Chrome, you must provide at least a 192x192 pixel icon, and a 512x512 pixel icon.
        // If only those two icon sizes are provided, Chrome will automatically scale the icons
        // to fit the device. If you'd prefer to scale your own icons, and adjust them for
        // pixel-perfection, provide icons in increments of 48dp.
        icons: [
          {
            src: "images/icon-512.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "images/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          // last one duplicated for purpose: 'any maskable'
          {
            src: "images/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  build: {
    outDir: "./build/app",
    manifest: true,
    target: browserslistToEsbuild(),
    reportCompressedSize: false,
    rollupOptions: {
      input: "./app/index.tsx",
      plugins: [webpackStats()],
    },
  },
});
