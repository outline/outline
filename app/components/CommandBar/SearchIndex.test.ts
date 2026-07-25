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

  it("highlights only exact matches, not fuzzy character runs", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Untitled",
        url: "/doc/1",
        text: "The quarterly revenue numbers exceeded all expectations.",
      },
    ]);

    // The typo "numbrs" has no literal occurrence, so only whole contiguous
    // matches are marked rather than the scattered characters Fuse matched on.
    const results = index.search("revenu numbrs");
    expect(results[0]?.document.id).toBe("1");
    expect(results[0]?.context).toContain("<b>revenu</b>");
    expect(results[0]?.context).not.toContain("numbrs");
    expect(results[0]?.context?.match(/<b>/g)).toHaveLength(1);
  });

  it("highlights the query where it appears inside a longer word", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Untitled",
        url: "/doc/1",
        text: "The quarterly revenue numbers exceeded all expectations.",
      },
    ]);

    // Partway through typing "revenue", the typed prefix is still marked.
    expect(index.search("revenu")[0]?.context).toContain("<b>revenu</b>");
  });

  it("highlights each term of a multi-word query separately", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Untitled",
        url: "/doc/1",
        text: "The quarterly revenue numbers exceeded all expectations.",
      },
    ]);

    const context = index.search("revenue numbers")[0]?.context;
    expect(context).toContain("<b>revenue numbers</b>");
  });

  it("marks a match as one contiguous run rather than letter runs", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Untitled",
        url: "/doc/1",
        text: "Engineering onboarding covers the deployment pipeline.",
      },
    ]);

    const context = index.search("deployment")[0]?.context;
    // The whole word is marked once, rather than scattered letter runs.
    expect(context).toContain("<b>deployment</b>");
    expect(context?.match(/<b>/g)).toHaveLength(1);
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

  it("clears content when an update sets text to an empty string", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Report",
        url: "/doc/1",
        text: "Contains the word pineapple somewhere inside.",
      },
    ]);
    // An explicit empty string (e.g. content emptied) must replace stale text.
    index.update([{ id: "1", title: "Report", url: "/doc/1", text: "" }]);

    expect(index.search("pineapple")).toEqual([]);
  });

  it("previews content for a title match that has no content match", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Engineering Handbook",
        url: "/doc/1",
        text: "Everything a new hire needs to know about our team.",
      },
    ]);

    const context = index.search("engineering")[0]?.context;
    expect(context).toBe("Everything a new hire needs to know about our team.");
  });

  it("has no context for a document with no content", () => {
    const index = new SearchIndex();
    index.update([{ id: "1", title: "Engineering Handbook", url: "/doc/1" }]);

    expect(index.search("engineering")[0]?.context).toBeUndefined();
  });

  it("truncates a long preview", () => {
    const index = new SearchIndex();
    index.update([
      {
        id: "1",
        title: "Engineering Handbook",
        url: "/doc/1",
        text: "word ".repeat(200),
      },
    ]);

    const context = index.search("engineering")[0]?.context ?? "";
    expect(context.endsWith("…")).toBe(true);
    expect(context.length).toBeLessThan(220);
  });

  it("orders a title prefix ahead of a shorter mid-title match", () => {
    const index = new SearchIndex();
    index.update([
      // Fuse scores this higher on its own, as the field is shorter and
      // position is ignored.
      { id: "mid", title: "Our Design", url: "/doc/mid" },
      {
        id: "prefix",
        title: "Design System Guidelines Handbook",
        url: "/doc/prefix",
      },
    ]);

    expect(index.search("design")[0]?.document.id).toBe("prefix");
  });

  it("orders a title prefix ahead of a shorter trailing-word match", () => {
    const index = new SearchIndex();
    index.update([
      { id: "mid", title: "Team Onboarding", url: "/doc/mid" },
      {
        id: "prefix",
        title: "Onboarding Checklist For New Hires",
        url: "/doc/prefix",
      },
    ]);

    expect(index.search("onboarding")[0]?.document.id).toBe("prefix");
  });

  it("orders a title prefix ahead of an equally scored mid-title match", () => {
    const index = new SearchIndex();
    index.update([
      // Both score identically in Fuse, leaving the order arbitrary.
      { id: "mid", title: "A Guide To Design", url: "/doc/mid" },
      { id: "prefix", title: "Design Is A Guide", url: "/doc/prefix" },
    ]);

    expect(index.search("design")[0]?.document.id).toBe("prefix");
  });

  it("orders a title prefix ahead of a content-only match", () => {
    const index = new SearchIndex();
    index.update([
      { id: "content", title: "Q3", url: "/doc/content", text: "revenue" },
      {
        id: "prefix",
        title: "Revenue Recognition Policy Handbook",
        url: "/doc/prefix",
      },
    ]);

    expect(index.search("revenue")[0]?.document.id).toBe("prefix");
  });

  it("breaks ties within a tier by fuzzy score", () => {
    const index = new SearchIndex();
    index.update([
      { id: "long", title: "Design System Guidelines", url: "/doc/long" },
      { id: "short", title: "Design", url: "/doc/short" },
    ]);

    // Both are prefix matches, so the closer title wins.
    expect(index.search("design")[0]?.document.id).toBe("short");
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
