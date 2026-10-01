import {
  combineTagIds,
  isNewTabClick,
  resolveFilterTagIds,
  mergeTargetOptions,
  shouldShowTagsLink,
  sortTags,
  toggleTagId,
  truncateTags,
} from "./tags";

const tag = (id: string, name: string, documentCount: number) => ({
  id,
  name,
  documentCount,
});

const alpha = tag("a", "alpha", 2);
const beta = tag("b", "beta", 5);
const gamma = tag("c", "gamma", 2);
const all = [gamma, alpha, beta];

describe("sortTags", () => {
  it("sorts by name ascending and descending", () => {
    expect(sortTags(all, "name", "ASC").map((t) => t.name)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
    expect(sortTags(all, "name", "DESC").map((t) => t.name)).toEqual([
      "gamma",
      "beta",
      "alpha",
    ]);
  });

  it("sorts by document count, ties by name", () => {
    expect(sortTags(all, "documentCount", "DESC").map((t) => t.name)).toEqual([
      "beta",
      "alpha",
      "gamma",
    ]);
    expect(sortTags(all, "documentCount", "ASC").map((t) => t.name)).toEqual([
      "alpha",
      "gamma",
      "beta",
    ]);
  });

  it("does not mutate the input", () => {
    const input = [...all];
    sortTags(input, "name", "ASC");
    expect(input).toEqual(all);
  });
});

describe("truncateTags", () => {
  it("shows every tag up to the limit", () => {
    expect(truncateTags([alpha, beta, gamma], 3)).toEqual({
      visible: [alpha, beta, gamma],
      hiddenCount: 0,
    });
  });

  it("shows the first tags and counts the rest", () => {
    const tags = [alpha, beta, gamma, tag("d", "delta", 1), tag("e", "e", 1)];
    expect(truncateTags(tags, 3)).toEqual({
      visible: [alpha, beta, gamma],
      hiddenCount: 2,
    });
  });

  it("defaults to three tags", () => {
    expect(truncateTags([alpha, beta, gamma, alpha]).hiddenCount).toBe(1);
  });

  it("handles no tags", () => {
    expect(truncateTags(undefined)).toEqual({ visible: [], hiddenCount: 0 });
  });
});

describe("mergeTargetOptions", () => {
  it("lists the other tags by name", () => {
    expect(mergeTargetOptions(all, "b").map((t) => t.id)).toEqual(["a", "c"]);
  });
});

describe("combineTagIds", () => {
  it("merges lists without duplicates or empty values", () => {
    expect(combineTagIds(["a", "", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("toggleTagId", () => {
  it("adds a missing id and removes a selected one", () => {
    expect(toggleTagId(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleTagId(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("shouldShowTagsLink", () => {
  it("shows the link to users who can create tags", () => {
    expect(
      shouldShowTagsLink({ loaded: true, count: 0, canCreate: true })
    ).toBe(true);
  });

  it("shows the link until tags have loaded", () => {
    expect(
      shouldShowTagsLink({ loaded: false, count: 0, canCreate: false })
    ).toBe(true);
  });

  it("hides the link when no tags are visible", () => {
    expect(
      shouldShowTagsLink({ loaded: true, count: 0, canCreate: false })
    ).toBe(false);
    expect(
      shouldShowTagsLink({ loaded: true, count: 1, canCreate: false })
    ).toBe(true);
  });
});

describe("resolveFilterTagIds", () => {
  const known = "3f1a4c2e-8b7d-4e6f-9a01-2b3c4d5e6f70";
  const stale = "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

  it("ignores malformed ids", () => {
    expect(resolveFilterTagIds(["not-a-uuid", "", known])).toEqual({
      applied: [known],
      unknown: [],
    });
  });

  it("keeps every well formed id until tags are known", () => {
    expect(resolveFilterTagIds([known, stale])).toEqual({
      applied: [known, stale],
      unknown: [],
    });
  });

  it("separates ids that match no loaded tag", () => {
    expect(
      resolveFilterTagIds([known, stale, known], (id) => id === known)
    ).toEqual({ applied: [known], unknown: [stale] });
  });
});

describe("isNewTabClick", () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false };

  it("is false for a plain left click", () => {
    expect(isNewTabClick(click)).toBe(false);
  });

  it("is true for modifier and middle clicks", () => {
    expect(isNewTabClick({ ...click, metaKey: true })).toBe(true);
    expect(isNewTabClick({ ...click, ctrlKey: true })).toBe(true);
    expect(isNewTabClick({ ...click, shiftKey: true })).toBe(true);
    expect(isNewTabClick({ ...click, button: 1 })).toBe(true);
  });
});
