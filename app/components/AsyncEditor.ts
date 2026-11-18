import lazyWithRetry from "@shared/utils/lazyWithRetry";

/**
 * The editor core is the largest chunk in the app and is kept out of the
 * initial bundle. This module stays light so routes can preload the chunk
 * without pulling editor dependencies into their own chunk.
 */
const AsyncEditor = lazyWithRetry(
  // oxlint-disable-next-line no-restricted-imports -- the one place the chunk is loaded
  () => import("~/editor")
);

export default AsyncEditor;
