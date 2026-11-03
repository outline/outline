/**
 * Whether an IndexedDB operation failed because the browser closed the
 * connection, in which case the operation did not run and can safely be
 * retried.
 *
 * @param err the error to check.
 * @returns true if the connection was closed.
 */
export function isConnectionClosedError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "InvalidStateError" || err.name === "AbortError")
  );
}

/**
 * Whether an IndexedDB operation failed because of the state of the browser
 * rather than a fault in the app, such as a closed connection, a full disk, or
 * storage that the browser deleted. These failures are not reported.
 *
 * @param err the error to check.
 * @returns true if the failure is expected.
 */
export function isExpectedIndexedDBError(err: unknown): boolean {
  return (
    isConnectionClosedError(err) ||
    (err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "UnknownError"))
  );
}
