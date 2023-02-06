import fs from "fs";
import path from "path";
import type { Plugin } from "vite";

const file = path.resolve("build/app/sw/sw.js");

export default function copy(): Plugin {
  return {
    name: "copy",
    apply: "build",
    writeBundle: (options, bundle) => {
      fs.readFile(file, "utf8", function (err, data) {
        if (err) {
          return console.log(err);
        }

        const files = Object.keys(bundle)
          .filter((asset) => {
            return !["index.js", "sw/sw.js", "sw/registerSW.js"].includes(
              asset
            );
          })
          .map((asset) => {
            // TODO: Add CDN URL
            return `/${asset}`;
          });

        const result = data.replace(/\["\/#"\]/g, JSON.stringify(files));

        fs.writeFile(file, result, "utf8", function (err) {
          if (err) {
            return console.log(err);
          }
        });
      });

      // TODO: Copy the service worker somewhere else
    },
  };
}
