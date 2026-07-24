import { SearchIndex } from "./SearchIndex";

describe("SearchIndex", () => {
  it("returns no results for an empty query", () => {
    const index = new SearchIndex();
    index.update([{ id: "1", title: "Engineering Handbook", url: "/doc/1" }]);

    expect(index.search("")).toEqual([]);
    expect(index.search("   ")).toEqual([]);
  });

  it("matches titles despite spelling mistakes", () => {
    const index = new SearchIndex();
    index.update([
      { id: "1", title: "Engineering Handbook", url: "/doc/1" },
      { id: "2", title: "Marketing Plan", url: "/doc/2" },
    ]);

    const results = index.search("enginering handbok");
    expect(results[0]?.document.id).toBe("1");
  });

  it("matches document content and highlights the context", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Untitled",
        url: "/doc/1",
        text: "The quarterly revenue numbers exceeded all expectations.",
      },
    ]);

    const results = index.search("revenue");
    expect(results[0]?.document.id).toBe("1");
    expect(results[0]?.context).toContain("<b>revenue</b>");
  });

  it("preserves previously indexed content when a later update omits it", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Report",
        url: "/doc/1",
        text: "Contains the word pineapple somewhere inside.",
      },
    ]);
    // A subsequent update (e.g. a title-only tree pass) must not drop content.
    index.update([{ id: "1", title: "Report", url: "/doc/1" }]);

    expect(index.search("pineapple")[0]?.document.id).toBe("1");
  });

  it("weights title matches above content matches", () => {
    const index = new SearchIndex();
    index.update([
      { id: "1", title: "Onboarding", url: "/doc/1", text: "unrelated body" },
      {
        id: "2",
        title: "Team",
        url: "/doc/2",
        text: "please read the onboarding guide",
      },
    ]);

    const results = index.search("onboarding");
    expect(results[0]?.document.id).toBe("1");
  });

  it("reports whether an update changed the collection", () => {
    const index = new SearchIndex();
    expect(index.update([{ id: "1", title: "A", url: "/doc/1" }])).toBe(true);
    expect(index.update([{ id: "1", title: "A", url: "/doc/1" }])).toBe(false);
  });

  it("clears all indexed documents", () => {
    const index = new SearchIndex();
    index.update([{ id: "1", title: "Engineering", url: "/doc/1" }]);
    index.clear();

    expect(index.search("engineering")).toEqual([]);
  });
});
