import { parseSearchQuery } from "./parseSearchQuery";

describe("parseSearchQuery", () => {
  it("returns empty tagNames and original query when no tags", () => {
    const result = parseSearchQuery("hello world");
    expect(result.cleanQuery).toBe("hello world");
    expect(result.tagNames).toEqual([]);
  });

  it("extracts a single tag and strips it from the query", () => {
    const result = parseSearchQuery("react #engineering");
    expect(result.cleanQuery).toBe("react");
    expect(result.tagNames).toEqual(["engineering"]);
  });

  it("extracts multiple tags", () => {
    const result = parseSearchQuery("#frontend #backend docs");
    expect(result.cleanQuery).toBe("docs");
    expect(result.tagNames).toEqual(["frontend", "backend"]);
  });

  it("normalizes tag names to lowercase", () => {
    const result = parseSearchQuery("#Engineering");
    expect(result.tagNames).toEqual(["engineering"]);
  });

  it("handles a query that is only tags", () => {
    const result = parseSearchQuery("#tag1 #tag2");
    expect(result.cleanQuery).toBe("");
    expect(result.tagNames).toEqual(["tag1", "tag2"]);
  });

  it("returns empty results for empty string", () => {
    const result = parseSearchQuery("");
    expect(result.cleanQuery).toBe("");
    expect(result.tagNames).toEqual([]);
  });

  it("ignores a lone # with no following name", () => {
    const result = parseSearchQuery("docs # react");
    expect(result.cleanQuery).toBe("docs # react");
    expect(result.tagNames).toEqual([]);
  });

  it("handles tags with hyphens and numbers", () => {
    const result = parseSearchQuery("#tag-1 #v2 docs");
    expect(result.tagNames).toEqual(["tag-1", "v2"]);
    expect(result.cleanQuery).toBe("docs");
  });

  it("deduplicates repeated tags", () => {
    const result = parseSearchQuery("#a #a #b");
    expect(result.tagNames).toEqual(["a", "b"]);
    expect(result.cleanQuery).toBe("");
  });

  it("extracts tags in any script", () => {
    const result = parseSearchQuery("notes #café #日本語 #données_2");
    expect(result.tagNames).toEqual(["café", "日本語", "données_2"]);
    expect(result.cleanQuery).toBe("notes");
  });

  it("keeps combining marks as part of the tag name", () => {
    const result = parseSearchQuery("#हिंदी docs");
    expect(result.tagNames).toEqual(["हिंदी"]);
    expect(result.cleanQuery).toBe("docs");
  });

  it("normalizes decomposed characters to NFC", () => {
    const result = parseSearchQuery("#Cafe\u0301");
    expect(result.tagNames).toEqual(["caf\u00e9"]);
  });

  it("stops the tag name at punctuation", () => {
    const result = parseSearchQuery("#release. notes");
    expect(result.tagNames).toEqual(["release"]);
    expect(result.cleanQuery).toBe(". notes");
  });

  it("keeps a trailing hyphen, which tag names allow", () => {
    const result = parseSearchQuery("#draft- docs");
    expect(result.tagNames).toEqual(["draft-"]);
  });

  it("ignores a # inside a word", () => {
    const result = parseSearchQuery("issue#42");
    expect(result.tagNames).toEqual([]);
    expect(result.cleanQuery).toBe("issue#42");
  });
});

describe("parseSearchQuery with known tags", () => {
  const known = new Set(["engineering", "café"]);
  const isKnown = (name: string) => known.has(name);

  it("strips only tokens that match a known tag", () => {
    const result = parseSearchQuery("#engineering PR #4521", isKnown);
    expect(result.tagNames).toEqual(["engineering"]);
    expect(result.unresolvedTagNames).toEqual(["4521"]);
    expect(result.cleanQuery).toBe("PR #4521");
  });

  it("keeps a query made only of unknown tokens as text", () => {
    const result = parseSearchQuery("#123", isKnown);
    expect(result.tagNames).toEqual([]);
    expect(result.unresolvedTagNames).toEqual(["123"]);
    expect(result.cleanQuery).toBe("#123");
  });

  it("matches known tags after normalizing the token", () => {
    const result = parseSearchQuery("#Café notes", isKnown);
    expect(result.tagNames).toEqual(["café"]);
    expect(result.cleanQuery).toBe("notes");
  });

  it("treats every token as a tag without a predicate", () => {
    const result = parseSearchQuery("#unknown docs");
    expect(result.tagNames).toEqual(["unknown"]);
    expect(result.unresolvedTagNames).toEqual([]);
  });
});
