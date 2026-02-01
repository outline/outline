import { DocumentConverter } from "./DocumentConverter";

describe("DocumentConverter", () => {
  describe("convert", () => {
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

      it("should handle csv with title row before headers", async () => {
        // Some financial exports have a title row before the actual headers
        const csv = `"Report for Account"

"Symbol","Name","Value",
"ABC","Test Corp","$100",
"XYZ","Other Inc","$200",`;

        const result = await DocumentConverter.convert(
          csv,
          "test.csv",
          "text/csv"
        );

        // The actual data headers should be used, not the title row
        expect(result.text).toContain("| Symbol | Name | Value |");
        expect(result.text).toContain("ABC");
        expect(result.text).toContain("Test Corp");
        expect(result.text).toContain("XYZ");
      });

      it("should handle csv with trailing comma on each line", async () => {
        const csv = `name,age,city,
John,25,NYC,
Jane,24,LA,`;

        const result = await DocumentConverter.convert(
          csv,
          "test.csv",
          "text/csv"
        );

        expect(result.text).toContain("| name | age | city |");
        expect(result.text).toContain("John");
        expect(result.text).toContain("Jane");
        // Should not have trailing empty column
        expect(result.text).not.toContain("| city |  |");
        expect(result.text).not.toContain("| city | |");
      });

      it("should preserve intentionally empty cells at end of rows", async () => {
        const csv = `name,age,city
John,25,NYC
Jane,24,`;

        const result = await DocumentConverter.convert(
          csv,
          "test.csv",
          "text/csv"
        );

        expect(result.text).toContain("| name | age | city |");
        expect(result.text).toContain("John");
        expect(result.text).toContain("NYC");
        // Jane's row should have 3 columns (empty city preserved)
        expect(result.text).toMatch(/\| Jane \| 24\s*\|\s*\|/);
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

  describe("htmlToProsemirror", () => {
    it("should convert basic HTML to Prosemirror", () => {
      const html = "<p>Hello world</p>";

      const doc = DocumentConverter.htmlToProsemirror(html);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);
      expect(doc.content.child(0).type.name).toBe("paragraph");
      expect(doc.content.child(0).textContent).toBe("Hello world");
    });

    it("should convert HTML with heading", () => {
      const html = "<h1>Title</h1><p>Content</p>";

      const doc = DocumentConverter.htmlToProsemirror(html);

      expect(doc.content.childCount).toBe(2);
      expect(doc.content.child(0).type.name).toBe("heading");
      expect(doc.content.child(0).attrs.level).toBe(1);
      expect(doc.content.child(0).textContent).toBe("Title");
      expect(doc.content.child(1).type.name).toBe("paragraph");
    });

    it("should remove script tags", () => {
      const html = "<p>Safe content</p><script>alert('xss')</script>";

      const doc = DocumentConverter.htmlToProsemirror(html);

      expect(doc.textContent).toBe("Safe content");
      expect(doc.textContent).not.toContain("alert");
    });

    it("should remove style tags", () => {
      const html = "<style>body { color: red; }</style><p>Content</p>";

      const doc = DocumentConverter.htmlToProsemirror(html);

      expect(doc.textContent).toBe("Content");
      expect(doc.textContent).not.toContain("color");
    });

    it("should handle Buffer input", () => {
      const html = Buffer.from("<p>From buffer</p>", "utf8");

      const doc = DocumentConverter.htmlToProsemirror(html);

      expect(doc.content.child(0).textContent).toBe("From buffer");
    });

    it("should convert HTML with lists", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";

      const doc = DocumentConverter.htmlToProsemirror(html);

      expect(doc.content.childCount).toBe(1);
      expect(doc.content.child(0).type.name).toBe("bullet_list");
      expect(doc.content.child(0).content.childCount).toBe(2);
    });

    it("should convert HTML with bold and italic", () => {
      const html = "<p><strong>Bold</strong> and <em>italic</em></p>";

      const doc = DocumentConverter.htmlToProsemirror(html);

      const paragraph = doc.content.child(0);
      expect(paragraph.type.name).toBe("paragraph");

      // Check that marks are applied
      const boldText = paragraph.content.child(0);
      expect(boldText.text).toBe("Bold");
      expect(boldText.marks.some((m) => m.type.name === "strong")).toBe(true);

      const italicText = paragraph.content.child(2);
      expect(italicText.text).toBe("italic");
      expect(italicText.marks.some((m) => m.type.name === "em")).toBe(true);
    });

    it("should handle full HTML document", () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Document Title</h1>
            <p>Paragraph content</p>
          </body>
        </html>
      `;

      const doc = DocumentConverter.htmlToProsemirror(html);

      expect(doc.content.childCount).toBe(2);
      expect(doc.content.child(0).type.name).toBe("heading");
      expect(doc.content.child(0).textContent).toBe("Document Title");
      expect(doc.content.child(1).type.name).toBe("paragraph");
      expect(doc.content.child(1).textContent).toBe("Paragraph content");
    });

    it("should remove emoticon images", () => {
      const html = `<p>Hello <img class="emoticon" src="smile.png" alt=":)"> world</p>`;

      const doc = DocumentConverter.htmlToProsemirror(html);

      // Emoticon image should be removed, text content remains
      expect(doc.textContent).not.toContain(":)");
      expect(doc.textContent).toContain("Hello");
      expect(doc.textContent).toContain("world");
    });

    it("should remove Jira icon images", () => {
      const html = `
        <p>Issue: <span class="jira-issue-key"><img class="icon" src="icon.png">ABC-123</span></p>
      `;

      const doc = DocumentConverter.htmlToProsemirror(html);

      expect(doc.textContent).toBe("Issue: ABC-123");
    });

    it("should apply Confluence image sizing", () => {
      const html = `
        <p><img src="image.png" data-width="800" data-height="600" width="400"></p>
      `;

      const doc = DocumentConverter.htmlToProsemirror(html);

      const paragraph = doc.content.child(0);
      const image = paragraph.content.child(0);
      expect(image.type.name).toBe("image");
      expect(image.attrs.width).toBe(400);
      expect(image.attrs.height).toBe(300);
    });
  });
});
