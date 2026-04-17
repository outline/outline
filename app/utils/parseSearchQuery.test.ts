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
});
