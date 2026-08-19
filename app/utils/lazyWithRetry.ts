import * as React from "react";

// oxlint-disable no-explicit-any -- ComponentType<any> is the standard React pattern for generic component constraints
type ComponentPromise<T extends React.ComponentType<any>> = Promise<{
  default: T;
}>;

/**
 * Matches errors thrown when a JavaScript chunk is missing, or when chunks from
 * different builds are mixed together – both usually the result of a deploy
 * happening while the tab was open.
 */
export const staleChunkErrorPattern =
  /dynamically imported module|module script failed|does not provide an export named/i;

/**
 * Whether an error was caused by loading a stale or missing JavaScript chunk.
 *
 * @param error the error to check.
 * @returns true if the error is a chunk loading failure.
 */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return staleChunkErrorPattern.test(message);
}

/**
 * Lazy load a component with automatic retry on failure.
 *
 * @param component A function that returns a promise of a component.
 * @param retries The number of retries, defaults to 3.
 * @param interval The interval between retries in milliseconds, defaults to 1000.
 * @returns A lazy component.
 */
export default function lazyWithRetry<T extends React.ComponentType<any>>(
  component: () => ComponentPromise<T>,
  retries?: number,
  interval?: number
): React.LazyExoticComponent<T> {
  return React.lazy(() => retry(component, retries, interval));
}

function retry<T extends React.ComponentType<any>>(
  fn: () => ComponentPromise<T>,
  retriesLeft = 3,
  interval = 1000
): ComponentPromise<T> {
  return new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch((error) => {
        setTimeout(() => {
          if (retriesLeft === 1) {
            // Retrying a removed chunk is futile, the only recovery is to
            // reload and fetch a fresh index.html with current chunk URLs.
            if (reloadIfStaleChunk(error)) {
              return;
            }
            reject(error);
            return;
          }
          retry(fn, retriesLeft - 1, interval).then(resolve, reject);
        }, interval);
      });
  });
}

const reloadSessionKey = "chunkReload";

/**
 * Reloads the page when a dynamic import fails because the chunk no longer
 * exists, or does not match the chunks already loaded – typically after a
 * deploy left an open tab referencing stale URLs. Guarded so it only reloads
 * once per session to avoid reload loops.
 *
 * @param error The error thrown by the failed dynamic import.
 * @returns Whether a reload was triggered.
 */
function reloadIfStaleChunk(error: unknown): boolean {
  if (!isStaleChunkError(error)) {
    return false;
  }

  try {
    if (sessionStorage.getItem(reloadSessionKey)) {
      return false;
    }
    sessionStorage.setItem(reloadSessionKey, "1");
  } catch {
    // sessionStorage may be unavailable (e.g. Safari private mode). Without it
    // we can't guard against a reload loop, so fail safe and don't reload.
    return false;
  }

  window.location.reload();
  return true;
}
