import type { Plugin } from "vite";

export default function copy(): Plugin {
  return {
    name: "copy",
    apply: "build",
    writeBundle: () => {
      // TODO: Add all files to the service worker and copy the service worker somewhere else
    },
  };
}
