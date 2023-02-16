import path from "path";
import react from "@vitejs/plugin-react";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default () => {
  return defineConfig({
    root: "./",
    base: "/static/",
    server: {
      port: 3001,
      host: true,
    },
    plugins: [
      // https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#readme
      react({
        babel: {
          parserOpts: {
            plugins: ["decorators-legacy", "classProperties"],
          },
        },
      }),
      // https://github.com/sapphi-red/vite-plugin-static-copy#readme
      viteStaticCopy({
        targets: [
          {
            src: "./public/images",
            dest: "./",
          },
        ],
      }),
      // https://vite-pwa-org.netlify.app/
      VitePWA({
        injectRegister: "inline",
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,ico,png,svg}"],
          navigateFallback: null,
        },
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
        keepNames: true,
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
      minify: "terser",
      target: browserslistToEsbuild(),
      reportCompressedSize: false,
      terserOptions: {
        keep_classnames: true,
        keep_fnames: true,
      },
      rollupOptions: {
        input: {
          index: "./app/index.tsx",
        },
        plugins: [webpackStats()],
      },
    },
  });
};
