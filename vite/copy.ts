export default function copy() {
  return {
    name: "copy",
    apply: "build",
    writeBundle: () => {
      // TODO: Add all files to the service worker and copy the service worker somewhere else
    },
  };
}
