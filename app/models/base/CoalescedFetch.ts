/**
 * Runs an async fetch so that concurrent calls share one request. A forced
 * call made while a request is in flight runs one more request after it, so
 * the result is never older than the forced call.
 */
export class CoalescedFetch<T = void> {
  /** Whether no request is in flight or queued. */
  get isIdle(): boolean {
    return !this.current && !this.next;
  }

  /**
   * Runs the fetch, or joins the request that is in flight.
   *
   * @param fetch the function that performs the request.
   * @param force whether the result must start after this call.
   * @returns a promise that resolves with the result of the request.
   */
  run(fetch: () => Promise<T>, force = false): Promise<T> {
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

  private current?: Promise<T>;
  private next?: Promise<T>;
}

/**
 * Runs a separate {@link CoalescedFetch} for each key, and discards it when
 * its requests are complete.
 */
export class KeyedCoalescedFetch<T> {
  /**
   * Runs the fetch for the key, or joins the request for the key that is in
   * flight.
   *
   * @param key the key that identifies the resource.
   * @param fetch the function that performs the request.
   * @param force whether the result must start after this call.
   * @returns a promise that resolves with the result of the request.
   */
  run(key: string, fetch: () => Promise<T>, force = false): Promise<T> {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = new CoalescedFetch<T>();
      this.entries.set(key, entry);
    }

    const promise = entry.run(fetch, force);
    const cleanup = () => {
      if (entry.isIdle && this.entries.get(key) === entry) {
        this.entries.delete(key);
      }
    };
    void promise.then(cleanup, cleanup);
    return promise;
  }

  private entries = new Map<string, CoalescedFetch<T>>();
}
