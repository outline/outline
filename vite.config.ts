import path from "path";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import nodeGlobals from "rollup-plugin-node-globals";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";

export default defineConfig({
  root: "./",
  server: {
    port: 3001,
  },
  plugins: [
    legacy({
      targets: "> 0.25%, not dead",
    }),
    react({
      babel: {
        babelrc: true,
        parserOpts: {
          plugins: ["decorators-legacy"],
        },
      },
    }),
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
    rollupOptions: {
      input: "./app/index.tsx",
      plugins: [nodeGlobals(), webpackStats()],
    },
  },
});
