import { SharedSearchIndex } from "./SharedSearchIndex";

describe("SharedSearchIndex", () => {
  it("returns no results for an empty query", () => {
    const index = new SharedSearchIndex();
    index.update([{ id: "1", title: "Engineering Handbook", url: "/doc/1" }]);

    expect(index.search("")).toEqual([]);
    expect(index.search("   ")).toEqual([]);
  });

  it("matches titles despite spelling mistakes", () => {
    const index = new SharedSearchIndex();
    index.update([
      { id: "1", title: "Engineering Handbook", url: "/doc/1" },
      { id: "2", title: "Marketing Plan", url: "/doc/2" },
    ]);

    const results = index.search("enginering handbok");
    expect(results[0]?.document.id).toBe("1");
  });

  it("matches document content and highlights the context", () => {
    const index = new SharedSearchIndex();
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
    const index = new SharedSearchIndex();
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
    const index = new SharedSearchIndex();
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
});
