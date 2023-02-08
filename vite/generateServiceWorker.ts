import fs from "fs";
import path from "path";
import type { Plugin } from "vite";

const file = path.resolve("build/app/sw/sw.js");

/**
 * This Rollup.js/Vite plugin adds all asset URLs to the Service Worker
 * and moves the Service Worker files (registerSW.js, sw.js) to the
 * public folder.
 *
 * Background: Serice Workers must be hosted on the same domain as the HTML (which is executing the request).
 */
export default function generateServiceWorker(configuration: {
  cdnUrl: string;
}): Plugin {
  return {
    name: "generateServiceWorker",
    apply: "build",
    writeBundle: (options, bundle) => {
      fs.readFile(file, "utf8", function (err, data) {
        if (err) {
          return console.log(err);
        }

        console.log(`[ServiceWorker] CDN_URL=${configuration.cdnUrl}`);

        const files = Object.keys(bundle)
          .filter((asset) => {
            return ![
              "index.js",
              "sw/sw.js",
              "sw/registerSW.js",
              "webpack-stats.json",
              "manifest.json",
            ].includes(asset);
          })
          .map((asset) => {
            return {
              // TODO: Add CDN URL
              url: `${configuration.cdnUrl}${asset}`,
              revision: null,
            };
          });

        const result = data.replace(/\["\/#"\]/g, JSON.stringify(files));

        fs.writeFile(file, result, "utf8", function (err) {
          if (err) {
            return console.log(err);
          }

          fs.rename(
            "build/app/sw/registerSW.js",
            "public/registerSW.js",
            () => {
              console.log(
                `[ServiceWorker] Moved "build/app/sw/registerSW.js" to "public/registerSW.js"`
              );
            }
          );

          fs.rename("build/app/sw/sw.js", "public/sw.js", () => {
            console.log(
              `[ServiceWorker] Moved "build/app/sw/sw.js" to "public/sw.js"`
            );
          });
        });
      });
    },
  };
}
