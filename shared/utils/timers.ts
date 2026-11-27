import { TimeoutError, withTimeout } from "es-toolkit";

/**
 * Returns a promise that resolves after a specified number of milliseconds.
 *
 * @param [delay=1] The number of milliseconds to wait before fulfilling the promise.
 */
export function sleep(ms = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs an async function with a time limit, and returns a fallback value when
 * the function takes too long. The function is not canceled, its result is
 * ignored when it settles after the time limit.
 *
 * @param run the function to run.
 * @param ms the time limit in milliseconds.
 * @param fallback the value to return when the time limit is reached.
 * @param onTimeout called when the time limit is reached.
 * @returns the result of the function, or the fallback.
 * @throws the error of the function, when it fails within the time limit.
 */
export async function withinTimeLimit<T>(
  run: () => Promise<T>,
  ms: number,
  fallback: T,
  onTimeout?: () => void
): Promise<T> {
  const controller = new AbortController();

  try {
    return await withTimeout(run, ms, { signal: controller.signal });
  } catch (err) {
    if (err instanceof TimeoutError) {
      onTimeout?.();
      return fallback;
    }
    throw err;
  } finally {
    // Clears the timer when the function finished within the time limit.
    controller.abort();
  }
}
