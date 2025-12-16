/**
 * Returns a promise that resolves after a specified number of milliseconds.
 *
 * @param [delay=1] The number of milliseconds to wait before fulfilling the promise.
 */
export function sleep(ms = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within the
 * specified time, it will be rejected with a timeout error.
 *
 * @param promise The promise to wrap with a timeout.
 * @param timeoutMs The timeout duration in milliseconds.
 * @param errorMessage Optional custom error message for the timeout.
 * @returns A promise that resolves with the original promise's value or rejects on timeout.
 */
export function promiseTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
