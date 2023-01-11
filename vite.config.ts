import path from "path";
import react from "@vitejs/plugin-react";
import nodeGlobals from "rollup-plugin-node-globals";
import { defineConfig } from "vite";

export default defineConfig({
  root: "./app",
  server: {
    port: 3001,
  },
  plugins: [
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
    manifest: true,
    rollupOptions: {
      input: "./app/index.tsx",
      plugins: [nodeGlobals()],
    },
  },
});
