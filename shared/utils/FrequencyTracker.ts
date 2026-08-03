import Storage from "./Storage";

export interface FrequencyTrackerOptions<T extends string> {
  /** Storage key under which the counts are persisted. */
  key: string;
  /** Storage key under which the most recently tracked item is persisted. */
  recentKey: string;
  /** Maximum number of items to keep counts for. */
  track: number;
  /** Maximum number of items returned by `frequent`. */
  get: number;
  /** Optional predicate deciding which items may be tracked and returned. */
  filter?: (item: T) => boolean;
}

/**
 * Tracks how often items are used, persisting the counts locally so the most
 * frequently and most recently used can be surfaced later.
 */
export class FrequencyTracker<T extends string> {
  public constructor(options: FrequencyTrackerOptions<T>) {
    this.options = options;
  }

  /**
   * The most recently tracked item, or undefined if there is none.
   */
  public get recent(): T | undefined {
    const item = Storage.get(this.options.recentKey) as T | undefined;
    return item && this.isTrackable(item) ? item : undefined;
  }

  /**
   * The most frequently tracked items, most frequent first. The most recently
   * tracked item is always included.
   */
  public get frequent(): T[] {
    const items = this.sorted(this.counts).slice(0, this.options.get);

    const { recent } = this;
    if (recent && !items.includes(recent)) {
      if (items.length === this.options.get) {
        items.pop();
      }
      items.push(recent);
    }

    return items;
  }

  /**
   * Records a use of the given item, making it the most recent.
   *
   * @param item the item that was used.
   */
  public track(item: T) {
    if (!this.isTrackable(item)) {
      return;
    }

    const counts = this.counts;

    // Seed from the recent item so history isn't lost for those who used this
    // tracker before counts were persisted.
    if (Object.keys(counts).length === 0 && this.recent) {
      counts[this.recent] = 1;
    }

    counts[item] = (counts[item] ?? 0) + 1;

    const entries = Object.entries(counts) as [T, number][];
    if (entries.length > this.options.track) {
      this.sortEntries(entries);

      // Keep the item just tracked, evicting the next least frequent instead.
      if (entries[this.options.track][0] === item) {
        entries.splice(this.options.track - 1, 1);
      }
      entries.splice(this.options.track);
    }

    Storage.set(this.options.key, Object.fromEntries(entries));
    Storage.set(this.options.recentKey, item);
  }

  private options: FrequencyTrackerOptions<T>;

  private get counts(): Record<T, number> {
    return (Storage.get(this.options.key) ?? {}) as Record<T, number>;
  }

  private isTrackable(item: T) {
    return this.options.filter?.(item) ?? true;
  }

  private sorted(counts: Record<T, number>): T[] {
    const entries = (Object.entries(counts) as [T, number][]).filter(([item]) =>
      this.isTrackable(item)
    );
    return this.sortEntries(entries).map(([item]) => item);
  }

  private sortEntries(entries: [T, number][]) {
    return entries.sort((a, b) => b[1] - a[1]);
  }
}
