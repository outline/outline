/**
 * Runs an async fetch so that concurrent calls share one request. A forced
 * call made while a request is in flight runs one more request after it, so
 * the result is never older than the forced call.
 */
export class CoalescedFetch {
  private current?: Promise<void>;
  private next?: Promise<void>;

  /**
   * Runs the fetch, or joins the request that is in flight.
   *
   * @param fetch the function that performs the request.
   * @param force whether the result must start after this call.
   * @returns a promise that resolves when the request completes.
   */
  run(fetch: () => Promise<void>, force = false): Promise<void> {
    if (!this.current) {
      this.current = fetch().finally(() => {
        this.current = undefined;
      });
      return this.current;
    }

    if (!force) {
      return this.current;
    }

    this.next ??= this.current
      .catch(() => undefined)
      .then(() => {
        this.next = undefined;
        return this.run(fetch, true);
      });
    return this.next;
  }
}
