import path from "path";
import react from "@vitejs/plugin-react";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";
// import generateServiceWorker from "./vite/generateServiceWorker";

export default () => {
  return defineConfig({
    root: "./",
    publicDir: "./server/static",
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
      // generateServiceWorker({
      //   cdnUrl: process.env.CDN_URL || "/",
      // }),
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
        /**
         * Regular assets can be hosted on a CDN.
         * But the Service Worker code must not be hosted on a CDN.
         * That’s why we need to separate the code:
         */
        input: {
          index: "./app/index.tsx",
          // sw: "./app/sw/sw.ts",
          // registerSW: "./app/sw/registerSW.ts",
        },
        // output: [
        //   {
        //     entryFileNames: (chunkInfo) => {
        //       const isServiceWorker = ["sw", "registerSW"].includes(
        //         chunkInfo.name
        //       );

        //       if (chunkInfo.isEntry && isServiceWorker) {
        //         return `sw/[name].js`;
        //       }

        //       return `[name]-[hash].js`;
        //     },
        //   },
        // ],
        plugins: [webpackStats()],
      },
    },
  });
};
