import { FrequencyTracker } from "./FrequencyTracker";
import Storage from "./Storage";

const createTracker = (options?: { filter?: (item: string) => boolean }) =>
  new FrequencyTracker<string>({
    key: "test-freq",
    recentKey: "test-recent",
    track: 3,
    get: 2,
    ...options,
  });

describe("FrequencyTracker", () => {
  beforeEach(() => {
    Storage.clear();
  });

  it("returns the most recently tracked item", () => {
    const tracker = createTracker();
    tracker.track("a");
    tracker.track("b");
    expect(tracker.recent).toBe("b");
  });

  it("returns nothing when nothing has been tracked", () => {
    expect(createTracker().recent).toBeUndefined();
    expect(createTracker().frequent).toEqual([]);
  });

  it("orders items by frequency, most frequent first", () => {
    const tracker = createTracker();
    tracker.track("a");
    tracker.track("b");
    tracker.track("b");
    expect(tracker.frequent).toEqual(["b", "a"]);
  });

  it("preserves insertion order for items of equal frequency", () => {
    const tracker = createTracker();
    tracker.track("a");
    tracker.track("b");
    expect(tracker.frequent).toEqual(["a", "b"]);
  });

  it("limits the items returned, always including the recent one", () => {
    const tracker = createTracker();
    tracker.track("a");
    tracker.track("a");
    tracker.track("b");
    tracker.track("b");
    tracker.track("c");
    expect(tracker.frequent).toEqual(["a", "c"]);
  });

  it("does not drop an item when the recent one already fits", () => {
    const tracker = createTracker();
    tracker.track("a");
    tracker.track("a");
    tracker.track("b");
    expect(tracker.frequent).toEqual(["a", "b"]);
  });

  it("keeps counts for a limited number of items", () => {
    const tracker = createTracker();
    ["a", "a", "b", "b", "c", "c", "d"].forEach((item) => tracker.track(item));
    expect(Storage.get("test-freq")).toEqual({ a: 2, b: 2, d: 1 });
  });

  it("ignores items excluded by the filter", () => {
    const tracker = createTracker({ filter: (item) => item !== "b" });
    tracker.track("a");
    tracker.track("b");
    expect(tracker.recent).toBe("a");
    expect(tracker.frequent).toEqual(["a"]);
  });

  it("excludes filtered items that were previously persisted", () => {
    const tracker = createTracker({ filter: (item) => item !== "b" });
    Storage.set("test-freq", { a: 1, b: 5 });
    Storage.set("test-recent", "b");
    expect(tracker.recent).toBeUndefined();
    expect(tracker.frequent).toEqual(["a"]);
  });

  it("seeds counts from the recent item when there are none", () => {
    const tracker = createTracker();
    Storage.set("test-recent", "a");
    tracker.track("b");
    expect(tracker.frequent).toEqual(["a", "b"]);
  });
});
