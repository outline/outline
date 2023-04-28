/**
 * Turns a promise into a suspended data loader. If the promise isn’t ready, it
 * will be thrown and caught by the closest suspense boundary. If the promise was
 * resolved, the result will be returned. If the promise was rejected, an
 * error is thrown.
 *
 * This should only be used in functional React components.
 *
 * @param promise The promise to resolve.
 * @returns The data that the promise resolved to.
 */
export function resolvePromise<T>(promise: Promise<T> | T): T {
  if (!(promise instanceof Promise)) {
    return promise;
  }
  const cachedPromise = promise as PromiseWithResultCache<T>;
  if (cachedPromise.__result__) {
    if (cachedPromise.__result__.rejected) {
      throw cachedPromise.__result__.rejected;
    }
    return cachedPromise.__result__.resolved as T;
  }

  void cachePromise(cachedPromise);
  throw cachedPromise;
}

/**
 * Caches the result of the promise inside itself so that it can used in an
 * optimized way with `resolvePromise`.
 */
function cachePromise<T>(promise: Promise<T>): void {
  if (!(promise as PromiseWithResultCache<T>).__cached__) {
    (promise as PromiseWithResultCache<T>).__cached__ = true;
    promise
      .then((resolved) => {
        (promise as PromiseWithResultCache<T>).__result__ = {
          resolved,
          success: true,
        };
      })
      .catch((rejected) => {
        (promise as PromiseWithResultCache<T>).__result__ = {
          rejected,
          success: false,
        };
      });
  }
}

interface PromiseWithResultCache<T> extends Promise<T> {
  /** If set, the promise has recorded its resolution or rejection. */
  __result__?: {
    /** What the promise resolved to. */
    resolved?: T;
    /** Set, if the promise was rejected */
    rejected?: unknown;
    /** Whether the promise is resolved (true), rejected (false), or pending (undefined). */
    success?: boolean;
  };
  __cached__: true;
}
