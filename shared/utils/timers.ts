/**
 * Returns a promise that resolves after a specified number of milliseconds.
 *
 * @param [delay=1] The number of milliseconds to wait before fulfilling the promise.
 */
export function sleep(ms = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
