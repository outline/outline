import { DocumentConverter } from "./DocumentConverter";

describe("DocumentConverter.convert", () => {
  describe("csv", () => {
    it("should convert csv to markdown table", async () => {
      const csv = `name,age
John,25
Jane,24`;

      const result = await DocumentConverter.convert(
        csv,
        "test.csv",
        "text/csv"
      );

      // CSV is converted to a markdown table
      expect(result.text).toContain("| name | age |");
      expect(result.text).toContain("John");
      expect(result.text).toContain("Jane");
      expect(result.title).toEqual("");
    });

    it("should handle csv with semicolon delimiter", async () => {
      const csv = `name;age
John;25
"Joan ""the bone"", Anne";24`;

      const result = await DocumentConverter.convert(
        csv,
        "test.csv",
        "text/csv"
      );

      expect(result.text).toContain("| name | age |");
      expect(result.text).toContain("John");
      expect(result.text).toContain('Joan "the bone", Anne');
    });
  });

  describe("html", () => {
    it("should extract title from H1", async () => {
      const html = "<h1>My Title</h1><p>Content here</p>";
      const result = await DocumentConverter.convert(
        html,
        "test.html",
        "text/html"
      );

      expect(result.title).toEqual("My Title");
      expect(result.text).toContain("Content here");
      expect(result.text).not.toContain("My Title");
    });

    it("should extract emoji from start", async () => {
      const html = "<p>🚀 Launch content</p>";
      const result = await DocumentConverter.convert(
        html,
        "test.html",
        "text/html"
      );

      expect(result.icon).toEqual("🚀");
      expect(result.text).not.toMatch(/^🚀/);
    });
  });

  describe("markdown", () => {
    it("should extract title from H1", async () => {
      const md = "# My Title\n\nContent here";
      const result = await DocumentConverter.convert(
        md,
        "test.md",
        "text/markdown"
      );

      expect(result.title).toEqual("My Title");
      expect(result.text).toContain("Content here");
      expect(result.text).not.toContain("My Title");
    });

    it("should return empty title when no H1", async () => {
      const md = "## Subtitle\n\nContent here";
      const result = await DocumentConverter.convert(
        md,
        "test.md",
        "text/markdown"
      );

      expect(result.title).toEqual("");
      expect(result.text).toContain("Subtitle");
    });
  });
});
