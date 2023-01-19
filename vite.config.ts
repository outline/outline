import path from "path";
import react from "@vitejs/plugin-react";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";
// import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: "./",
  server: {
    port: 3001,
  },
  plugins: [
    react({
      babel: {
        babelrc: true,
      },
    }),
    // VitePWA(),
  ],
  optimizeDeps: {
    exclude: ["@benrbray/prosemirror-math"],
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
    // reportCompressedSize: false,
    rollupOptions: {
      input: "./app/index.tsx",
      plugins: [webpackStats()],
    },
  },
});
