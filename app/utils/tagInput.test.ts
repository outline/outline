import type Tag from "~/models/Tag";
import {
  buildTagOptions,
  initialTagInputState,
  resolveTagSelection,
  tagInputReducer,
  validateTagName,
} from "./tagInput";
import type { TagInputState } from "./tagInput";

const tag = (id: string, name: string) => ({ id, name }) as unknown as Tag;

const alpha = tag("a1", "alpha");
const alphabet = tag("a2", "alphabet");
const beta = tag("b1", "beta");
const known = [alpha, alphabet, beta];
const findByName = (name: string) => known.find((t) => t.name === name);

describe("validateTagName", () => {
  it("accepts letters, digits, marks, hyphens and underscores in any script", () => {
    expect(validateTagName("release-2_0")).toBeUndefined();
    expect(validateTagName("日本語")).toBeUndefined();
    expect(validateTagName("हिंदी")).toBeUndefined();
  });

  it("validates the normalized name", () => {
    expect(validateTagName("  Café  ")).toBeUndefined();
  });

  it("rejects an empty name", () => {
    expect(validateTagName("   ")).toBe("empty");
  });

  it("rejects characters outside the tag charset", () => {
    expect(validateTagName("two words")).toBe("invalid");
    expect(validateTagName("#hash")).toBe("invalid");
    expect(validateTagName("a.b")).toBe("invalid");
    // at least one letter or digit is required
    expect(validateTagName("---")).toBe("invalid");
    expect(validateTagName("_")).toBe("invalid");
    expect(validateTagName("\u0301")).toBe("invalid");
    expect(validateTagName("-a-")).toBeUndefined();
  });

  it("rejects names over the maximum length", () => {
    expect(validateTagName("a".repeat(100))).toBeUndefined();
    expect(validateTagName("a".repeat(101))).toBe("tooLong");
  });
});

describe("buildTagOptions", () => {
  it("returns no options for empty input", () => {
    expect(buildTagOptions(known, "  ", new Set(), findByName)).toEqual([]);
  });

  it("suggests matching tags, prefix matches first, then a create row", () => {
    const options = buildTagOptions(
      [beta, tag("c1", "tabby"), alpha],
      "b",
      new Set(),
      () => undefined
    );

    expect(options).toEqual([
      { type: "tag", tag: beta },
      { type: "tag", tag: expect.objectContaining({ name: "tabby" }) },
      { type: "create", name: "b" },
    ]);
  });

  it("excludes tags already on the document", () => {
    const options = buildTagOptions(known, "alp", new Set(["a1"]), findByName);

    expect(options).toEqual([
      { type: "tag", tag: alphabet },
      { type: "create", name: "alp" },
    ]);
  });

  it("omits the create row when a tag with that name exists", () => {
    const options = buildTagOptions(known, "Alpha", new Set(), findByName);

    expect(options).toEqual([
      { type: "tag", tag: alpha },
      { type: "tag", tag: alphabet },
    ]);
  });

  it("omits the create row when the existing tag is already applied", () => {
    const options = buildTagOptions(known, "beta", new Set(["b1"]), findByName);

    expect(options).toEqual([]);
  });

  it("omits the create row for invalid input", () => {
    const options = buildTagOptions(known, "al pha", new Set(), findByName);

    expect(options).toEqual([]);
  });

  it("omits the create row when the user cannot create tags", () => {
    const options = buildTagOptions(known, "alp", new Set(), findByName, {
      canCreate: false,
    });

    expect(options).toEqual([
      { type: "tag", tag: alpha },
      { type: "tag", tag: alphabet },
    ]);
  });

  it("limits the number of suggestions", () => {
    const many = Array.from({ length: 12 }, (_, i) => tag(`t${i}`, `tag${i}`));
    const options = buildTagOptions(many, "tag", new Set(), () => undefined, {
      maxSuggestions: 8,
    });

    expect(options.filter((o) => o.type === "tag")).toHaveLength(8);
    expect(options[options.length - 1]).toEqual({
      type: "create",
      name: "tag",
    });
  });
});

describe("tagInputReducer", () => {
  const typed = (value: string): TagInputState =>
    tagInputReducer(initialTagInputState, { type: "change", value });

  it("opens with nothing highlighted while typing", () => {
    expect(typed("al")).toEqual({
      value: "al",
      highlightedIndex: -1,
      isOpen: true,
    });
  });

  it("closes when the input is cleared", () => {
    expect(tagInputReducer(typed("al"), { type: "change", value: "" })).toEqual(
      initialTagInputState
    );
  });

  it("moves down through suggestions onto the create row and stops there", () => {
    let state = typed("al");
    const optionCount = 3; // two suggestions and the create row

    state = tagInputReducer(state, { type: "move", delta: 1, optionCount });
    expect(state.highlightedIndex).toBe(0);
    state = tagInputReducer(state, { type: "move", delta: 1, optionCount });
    state = tagInputReducer(state, { type: "move", delta: 1, optionCount });
    expect(state.highlightedIndex).toBe(2);
    state = tagInputReducer(state, { type: "move", delta: 1, optionCount });
    expect(state.highlightedIndex).toBe(2);
    expect(state.value).toBe("al");
  });

  it("moves up from the create row back to the typed text", () => {
    let state = { ...typed("al"), highlightedIndex: 1 };

    state = tagInputReducer(state, { type: "move", delta: -1, optionCount: 2 });
    expect(state.highlightedIndex).toBe(0);
    state = tagInputReducer(state, { type: "move", delta: -1, optionCount: 2 });
    expect(state.highlightedIndex).toBe(-1);
    state = tagInputReducer(state, { type: "move", delta: -1, optionCount: 2 });
    expect(state.highlightedIndex).toBe(-1);
  });

  it("does not move without options", () => {
    const state = tagInputReducer(typed("al"), {
      type: "move",
      delta: 1,
      optionCount: 0,
    });

    expect(state.highlightedIndex).toBe(-1);
  });

  it("reopens a closed list on arrow down", () => {
    let state = tagInputReducer(typed("al"), { type: "close" });

    state = tagInputReducer(state, { type: "move", delta: 1, optionCount: 2 });
    expect(state).toEqual({ value: "al", highlightedIndex: 0, isOpen: true });
  });

  it("highlights the hovered option", () => {
    const state = tagInputReducer(typed("al"), {
      type: "highlight",
      index: 1,
    });

    expect(state.highlightedIndex).toBe(1);
  });

  it("keeps the typed text when closed by blur", () => {
    const state = tagInputReducer(
      { ...typed("al"), highlightedIndex: 1 },
      { type: "close" }
    );

    expect(state).toEqual({ value: "al", highlightedIndex: -1, isOpen: false });
  });

  it("escape closes an open list first, then clears the input", () => {
    let state = tagInputReducer(typed("al"), { type: "escape" });
    expect(state).toEqual({ value: "al", highlightedIndex: -1, isOpen: false });

    state = tagInputReducer(state, { type: "escape" });
    expect(state).toEqual(initialTagInputState);
  });

  it("resets after a tag is added", () => {
    expect(tagInputReducer(typed("al"), { type: "reset" })).toEqual(
      initialTagInputState
    );
  });
});

describe("resolveTagSelection", () => {
  const options = buildTagOptions(known, "alp", new Set(), findByName);
  // [alpha, alphabet, create "alp"]
  const resolve = (value: string, highlightedIndex = -1) =>
    resolveTagSelection({
      value,
      highlightedIndex,
      options: buildTagOptions(known, value, new Set(["b1"]), findByName),
      appliedIds: new Set(["b1"]),
      findByName,
    });

  it("attaches the highlighted existing tag without creating it", () => {
    expect(
      resolveTagSelection({
        value: "alp",
        highlightedIndex: 1,
        options,
        appliedIds: new Set(),
        findByName,
      })
    ).toEqual({ type: "attach", tag: alphabet });
  });

  it("creates from the highlighted create row", () => {
    expect(
      resolveTagSelection({
        value: "alp",
        highlightedIndex: 2,
        options,
        appliedIds: new Set(),
        findByName,
      })
    ).toEqual({ type: "create", name: "alp" });
  });

  it("attaches an existing tag typed exactly, ignoring case and spacing", () => {
    expect(resolve("  ALPHA ")).toEqual({ type: "attach", tag: alpha });
  });

  it("creates a new tag from free text", () => {
    expect(resolve("Gamma")).toEqual({ type: "create", name: "gamma" });
  });

  it("does not create from free text when the user cannot create tags", () => {
    const select = (value: string) =>
      resolveTagSelection({
        value,
        highlightedIndex: -1,
        options: [],
        appliedIds: new Set(),
        findByName,
        canCreate: false,
      });

    expect(select("Gamma")).toEqual({ type: "unknown" });
    expect(select("alpha")).toEqual({ type: "attach", tag: alpha });
  });

  it("does nothing when the typed tag is already applied", () => {
    expect(resolve("beta")).toEqual({ type: "none" });
  });

  it("does nothing for empty input", () => {
    expect(resolve("   ")).toEqual({ type: "none" });
  });

  it("reports invalid free text instead of creating it", () => {
    expect(resolve("two words")).toEqual({ type: "invalid", error: "invalid" });
    expect(resolve("a".repeat(101))).toEqual({
      type: "invalid",
      error: "tooLong",
    });
  });

  it("falls back to the typed text when the highlight is out of range", () => {
    expect(resolve("gamma", 5)).toEqual({ type: "create", name: "gamma" });
  });
});
