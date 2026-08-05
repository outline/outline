import path from "node:path";
import fs from "fs-extra";
import { buildZip } from "@server/test/support";
import { DocumentConverter } from "./DocumentConverter";

const fixture = (fileName: string) =>
  fs.readFile(path.resolve(__dirname, "..", "test", "fixtures", fileName));

/** A 1x1 transparent PNG, small enough to embed in a test bundle. */
const PNG_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

/** A TextBundle as an app would write it: wrapper folder, metadata and assets. */
const BASIC_BUNDLE = {
  "Note.textbundle/info.json": JSON.stringify({
    version: 2,
    type: "net.daringfireball.markdown",
    transient: false,
  }),
  "Note.textbundle/text.markdown":
    "# My Note\n\nHello world!\n\n![a photo](assets/image.png)\n",
  "Note.textbundle/assets/image.png": PNG_PIXEL,
};

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

      it("should convert csv when the mime type is not recognized", async () => {
        const csv = `name,age
John,25`;

        const result = await DocumentConverter.convert(
          csv,
          "test.csv",
          "application/vnd.ms-excel"
        );

        expect(result.text).toContain("| name | age |");
        expect(result.text).toContain("John");
      });
    });

    describe("tsv", () => {
      it("should convert tsv to markdown table", async () => {
        const tsv = "name\tage\nJohn\t25\nJane\t24";

        const result = await DocumentConverter.convert(
          tsv,
          "test.tsv",
          "text/tab-separated-values"
        );

        expect(result.text).toContain("| name | age |");
        expect(result.text).toContain("John");
        expect(result.text).toContain("Jane");
      });

      it("should convert tsv when the mime type is not recognized", async () => {
        const tsv = "name\tage\nJohn\t25";

        const result = await DocumentConverter.convert(tsv, "test.tsv", "");

        expect(result.text).toContain("| name | age |");
        expect(result.text).toContain("John");
      });
    });

    describe("txt", () => {
      it("should convert txt when the mime type is not recognized", async () => {
        const txt = "Plain text content";

        const result = await DocumentConverter.convert(txt, "test.txt", "");

        expect(result.text).toContain("Plain text content");
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

      it("should extract emoji leading the title", async () => {
        const html = "<h1>🚀 My Title</h1><p>Content here</p>";
        const result = await DocumentConverter.convert(
          html,
          "test.html",
          "text/html"
        );

        expect(result.icon).toEqual("🚀");
        expect(result.title).toEqual("My Title");
      });

      it("should leave the body alone when the title supplied an emoji", async () => {
        const html = "<h1>🚀 My Title</h1><p>🎉 Content here</p>";
        const result = await DocumentConverter.convert(
          html,
          "test.html",
          "text/html"
        );

        expect(result.icon).toEqual("🚀");
        expect(result.title).toEqual("My Title");
        expect(result.text).toContain("🎉 Content here");
      });

      it("should not treat an emoji later in the title as an icon", async () => {
        const html = "<h1>My Title 🚀</h1><p>Content here</p>";
        const result = await DocumentConverter.convert(
          html,
          "test.html",
          "text/html"
        );

        expect(result.icon).toBeUndefined();
        expect(result.title).toEqual("My Title 🚀");
      });

      it("should convert htm when the mime type is not recognized", async () => {
        const html = "<h1>My Title</h1><p>Content here</p>";
        const result = await DocumentConverter.convert(html, "test.HTM", "");

        expect(result.title).toEqual("My Title");
        expect(result.text).toContain("Content here");
      });
    });

    describe("mhtml", () => {
      it("should convert a Chrome-saved MHTML page with an inline image", async () => {
        const content = await fixture("webpage.mhtml");
        const result = await DocumentConverter.convert(
          content,
          "webpage.mhtml",
          "multipart/related"
        );

        expect(result.title).toEqual("Heading 1");
        expect(result.text).toContain("Text paragraph with a logo below");
        // The tracking script and stylesheet should not leak into the content
        expect(result.text).not.toContain("tracking pixel");
        expect(result.text).not.toContain("font-family");
        // The image referenced by Content-Location should be inlined as a data URI
        expect(result.text).toMatch(/!\[.*?\]\(data:image\/png;base64,/);
      });

      it("should fall back to the .mhtml extension when the mime type is unrecognized", async () => {
        const content = await fixture("webpage.mhtml");
        const result = await DocumentConverter.convert(
          content,
          "webpage.mhtml",
          "application/octet-stream"
        );

        expect(result.title).toEqual("Heading 1");
        expect(result.text).toContain("Text paragraph with a logo below");
      });

      it("should throw a clean error for a malformed archive", async () => {
        const content = "This is not a MIME archive, just plain garbage.";

        await expect(
          DocumentConverter.convert(content, "broken.mhtml", "")
        ).rejects.toThrow("Unsupported MHTML file (No content found)");
      });
    });

    describe("eml", () => {
      it("should convert an .eml with a cid: referenced inline image", async () => {
        const content = await fixture("email-with-image.eml");
        const result = await DocumentConverter.convert(
          content,
          "email-with-image.eml",
          "message/rfc822"
        );

        // The Subject header becomes the document title
        expect(result.title).toEqual("Meeting notes");
        expect(result.text).toContain("Text paragraph with our logo");
        // The image referenced by cid: should be inlined as a data URI
        expect(result.text).toMatch(/!\[.*?\]\(data:image\/png;base64,/);
      });

      it("should discard a malformed content type when inlining a part", async () => {
        const content = [
          "From: alice@example.com",
          "Subject: Malformed content type",
          "MIME-Version: 1.0",
          'Content-Type: multipart/related; boundary="B"',
          "",
          "--B",
          "Content-Type: text/html",
          "",
          '<html><body><p>hi</p><img src="cid:x@example.com"></body></html>',
          "--B",
          'Content-Type: image/png"><script>alert(1)</script><img src="x',
          "Content-Transfer-Encoding: base64",
          "Content-ID: <x@example.com>",
          "",
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "",
          "--B--",
          "",
        ].join("\r\n");

        const result = await DocumentConverter.convert(
          content,
          "malformed.eml",
          "message/rfc822"
        );

        expect(result.text).not.toContain("alert(1)");
        expect(result.text).toMatch(
          /!\[.*?\]\(data:application\/octet-stream;base64,/
        );
      });

      it("should fall back to plain text when there is no HTML part", async () => {
        const content = await fixture("email-plain-text.eml");
        const result = await DocumentConverter.convert(
          content,
          "email-plain-text.eml",
          "message/rfc822"
        );

        expect(result.title).toEqual("Plain text note");
        expect(result.text).toContain(
          "This is a plain text email with no HTML part"
        );
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

      it("should keep the leading H1 in the body when extractTitle is false", async () => {
        const md = "# My Title\n\nContent here";
        const result = await DocumentConverter.convert(
          md,
          "test.md",
          "text/markdown",
          { extractTitle: false }
        );

        expect(result.title).toEqual("");
        expect(result.text).toContain("My Title");
        expect(result.text).toContain("Content here");
      });

      it("should convert frontmatter to yaml codeblock", async () => {
        const md = `---
title: Test Document
date: 2024-01-15
tags: [test, markdown]
---

# My Title

Content after frontmatter`;
        const result = await DocumentConverter.convert(
          md,
          "test.md",
          "text/markdown"
        );

        // Frontmatter should be converted to a YAML codeblock
        expect(result.text).toContain("```yaml");
        expect(result.text).toContain("title: Test Document");
        expect(result.text).toContain("date: 2024-01-15");
        expect(result.text).toContain("tags: [test, markdown]");
        expect(result.text).toContain("```");
        // Content should still be present
        expect(result.text).toContain("Content after frontmatter");
        // H1 should be extracted as title
        expect(result.title).toEqual("My Title");
      });

      it("should handle markdown without frontmatter", async () => {
        const md = "# Title\n\nRegular content";
        const result = await DocumentConverter.convert(
          md,
          "test.md",
          "text/markdown"
        );

        expect(result.title).toEqual("Title");
        expect(result.text).toContain("Regular content");
        expect(result.text).not.toContain("```yaml");
      });

      it("should handle frontmatter with no content after", async () => {
        const md = `---
title: Only Frontmatter
---`;
        const result = await DocumentConverter.convert(
          md,
          "test.md",
          "text/markdown"
        );

        expect(result.text).toContain("```yaml");
        expect(result.text).toContain("title: Only Frontmatter");
        expect(result.text).toContain("```");
        expect(result.title).toEqual("");
      });

      it("should not convert incomplete frontmatter", async () => {
        const md = `---
title: Test
Content without closing delimiter`;
        const result = await DocumentConverter.convert(
          md,
          "test.md",
          "text/markdown"
        );

        // Should not convert as it's not proper frontmatter
        expect(result.text).not.toContain("```yaml");
        expect(result.text).toContain("title: Test");
      });

      it("should not convert frontmatter if not at start", async () => {
        const md = `# Title

Some content

---
title: Test
---

More content`;
        const result = await DocumentConverter.convert(
          md,
          "test.md",
          "text/markdown"
        );

        // Should not convert as frontmatter must be at the start
        expect(result.text).not.toContain("```yaml");
      });

      it("should handle invalid YAML in frontmatter", async () => {
        const md = `---
invalid: yaml: content: here
---

Content`;
        const result = await DocumentConverter.convert(
          md,
          "test.md",
          "text/markdown"
        );

        // Should not convert invalid YAML
        expect(result.text).not.toContain("```yaml");
      });
    });

    describe("textpack", () => {
      it("should convert a wrapped TextBundle to markdown and embed its assets", async () => {
        const content = await buildZip(BASIC_BUNDLE);

        const result = await DocumentConverter.convert(
          content,
          "My Note.textpack",
          "application/octet-stream"
        );

        expect(result.title).toEqual("My Note");
        expect(result.text).toContain("Hello world!");
        expect(result.text).toContain("data:image/png;base64,");
        expect(result.text).not.toContain("assets/image.png");
      });

      it("should lift an emoji leading the title into the icon", async () => {
        const content = await buildZip({
          "Note.textbundle/text.markdown": "# 🚀 My Note\n\nHello world!\n",
        });

        const result = await DocumentConverter.convert(
          content,
          "My Note.textpack",
          "application/octet-stream"
        );

        expect(result.icon).toEqual("🚀");
        expect(result.title).toEqual("My Note");
        expect(result.text).toContain("Hello world!");
      });

      it("should convert a flat TextBundle (no wrapper folder, text.md) to markdown", async () => {
        const content = await buildZip({
          "info.json": JSON.stringify({
            version: 1,
            type: "net.daringfireball.markdown",
          }),
          "text.md": "# Flat Note\n\nSee ![](assets/photo.jpg) here.\n",
          "assets/photo.jpg": PNG_PIXEL,
        });

        const result = await DocumentConverter.convert(
          content,
          "Flat.textpack",
          "application/octet-stream"
        );

        expect(result.title).toEqual("Flat Note");
        expect(result.text).toContain("data:image/jpeg;base64,");
        expect(result.text).not.toContain("assets/photo.jpg");
      });

      it("should tolerate a bundle with no info.json", async () => {
        const content = await buildZip({
          "Plain.textbundle/text.txt":
            "Just plain text content, no heading here.\n",
        });

        const result = await DocumentConverter.convert(
          content,
          "Plain.textpack",
          "application/octet-stream"
        );

        expect(result.text).toContain(
          "Just plain text content, no heading here."
        );
      });

      it("should fall back to extension-based routing when mimetype is unrecognized", async () => {
        const content = await buildZip(BASIC_BUNDLE);

        const result = await DocumentConverter.convert(
          content,
          "My Note.textpack",
          "application/zip"
        );

        expect(result.title).toEqual("My Note");
      });

      it("should skip path-traversal entries and still import the legitimate text file", async () => {
        const content = await fixture("textbundle-traversal.textpack");

        const result = await DocumentConverter.convert(
          content,
          "Note.textpack",
          "application/octet-stream"
        );

        expect(result.title).toEqual("Safe");
        expect(result.text).toContain("Content here.");
      });

      it("should reject a bundle with no recognizable text file", async () => {
        const content = await buildZip({
          "Empty.textbundle/info.json": JSON.stringify({
            version: 2,
            type: "net.daringfireball.markdown",
          }),
          "Empty.textbundle/assets/image.png": PNG_PIXEL,
        });

        await expect(
          DocumentConverter.convert(
            content,
            "Empty.textpack",
            "application/octet-stream"
          )
        ).rejects.toThrow(
          "TextPack file does not contain a recognizable text file"
        );
      });

      it("should reject an asset larger than the maximum, however well it compresses", async () => {
        const content = await buildZip({
          "text.markdown": "# Note\n\n![big](assets/big.png)",
          // Compresses to almost nothing, so the archive stays small while the
          // asset is far past what may be held in memory as a data URI.
          "assets/big.png": Buffer.alloc(20 * 1024 * 1024),
        });

        await expect(
          DocumentConverter.convert(content, "Note.textpack", "")
        ).rejects.toThrow("too large");
      });

      it("should reject a bundle with an absurd number of entries", async () => {
        const files: Record<string, string> = {
          "text.markdown": "# Note",
        };
        for (let i = 0; i < 2001; i++) {
          files[`assets/file-${i}.txt`] = "x";
        }
        const content = await buildZip(files);

        await expect(
          DocumentConverter.convert(content, "Note.textpack", "")
        ).rejects.toThrow("TextPack file contains too many entries");
      });

      it("should read a text file with an extension the spec leaves open", async () => {
        const content = await buildZip({
          "Note.textbundle/info.json": JSON.stringify({
            version: 2,
            type: "net.daringfireball.markdown",
          }),
          "Note.textbundle/text.fountain": "# Screenplay\n\nFade in.",
        });

        const result = await DocumentConverter.convert(
          content,
          "Note.textpack",
          ""
        );

        expect(result.title).toEqual("Screenplay");
        expect(result.text).toContain("Fade in.");
      });

      it("should reject a bundle whose info.json declares a format we cannot read", async () => {
        const content = await buildZip({
          "Note.textbundle/info.json": JSON.stringify({
            version: 2,
            type: "public.rtf",
          }),
          "Note.textbundle/text.rtf": "{\\rtf1 hello}",
        });

        await expect(
          DocumentConverter.convert(content, "Note.textpack", "")
        ).rejects.toThrow("public.rtf");
      });

      it("should reject an unreadable text extension when info.json is absent", async () => {
        const content = await buildZip({
          "text.rtf": "{\\rtf1 hello}",
        });

        await expect(
          DocumentConverter.convert(content, "Note.textpack", "")
        ).rejects.toThrow(".rtf");
      });

      it("should embed an asset referenced by a link carrying a title", async () => {
        const content = await buildZip({
          "text.markdown": '# Note\n\n![a photo](assets/img.png "Caption")',
          "assets/img.png": PNG_PIXEL,
        });

        const result = await DocumentConverter.convert(
          content,
          "Note.textpack",
          ""
        );

        expect(result.text).toContain("data:image/png;base64,");
        expect(result.text).not.toContain("assets/img.png");
      });

      it("should embed an asset whose destination is wrapped in angle brackets", async () => {
        const content = await buildZip({
          "text.markdown": "# Note\n\n![a photo](<assets/my photo.png>)",
          "assets/my photo.png": PNG_PIXEL,
        });

        const result = await DocumentConverter.convert(
          content,
          "Note.textpack",
          ""
        );

        expect(result.text).toContain("data:image/png;base64,");
        expect(result.text).not.toContain("my photo.png");
      });

      it("should embed an asset when the assets folder is not lowercased", async () => {
        const content = await buildZip({
          "text.markdown": "# Note\n\n![a photo](assets/photo.png)",
          "Assets/photo.png": PNG_PIXEL,
        });

        const result = await DocumentConverter.convert(
          content,
          "Note.textpack",
          ""
        );

        expect(result.text).toContain("data:image/png;base64,");
      });

      it("should leave an asset markdown-it cannot accept as a data URI alone", async () => {
        const content = await buildZip({
          "text.markdown":
            "# Note\n\n[the spec](assets/spec.pdf)\n\n![vector](assets/logo.svg)",
          "assets/spec.pdf": Buffer.from("%PDF-1.4\n"),
          "assets/logo.svg": Buffer.from("<svg></svg>"),
        });

        const result = await DocumentConverter.convert(
          content,
          "Note.textpack",
          ""
        );

        // Inlining these would leave the base64 in the document as literal
        // text, since markdown-it rejects the destination.
        expect(result.text).not.toContain("base64");
        expect(result.text).toContain("assets/spec.pdf");
        expect(result.text).toContain("assets/logo.svg");
      });
    });

    describe("pdf", () => {
      it("should convert a pdf to markdown by mime type", async () => {
        const content = await fixture("document.pdf");

        const result = await DocumentConverter.convert(
          content,
          "document.pdf",
          "application/pdf"
        );

        expect(result.title).toEqual("Sample PDF");
        expect(result.text).toContain("Hello from a PDF document.");
        expect(result.text).toContain("Second line of text.");
      });

      it("should convert a pdf to markdown by file extension", async () => {
        const content = await fixture("document.pdf");

        const result = await DocumentConverter.convert(
          content,
          "document.pdf",
          "application/octet-stream"
        );

        expect(result.title).toEqual("Sample PDF");
        expect(result.text).toContain("Hello from a PDF document.");
      });

      it("should throw for a pdf without extractable text", async () => {
        const content = await fixture("scanned.pdf");

        await expect(
          DocumentConverter.convert(content, "scanned.pdf", "application/pdf")
        ).rejects.toThrow(/no text/);
      });

      it("should throw for a file that is not a pdf", async () => {
        await expect(
          DocumentConverter.convert(
            Buffer.from("not really a pdf"),
            "document.pdf",
            "application/pdf"
          )
        ).rejects.toThrow(/error parsing the PDF file/);
      });
    });
  });

  describe("htmlToProsemirror", () => {
    it("should convert basic HTML to Prosemirror", async () => {
      const html = "<p>Hello world</p>";

      const doc = await DocumentConverter.htmlToProsemirror(html);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);
      expect(doc.content.child(0).type.name).toBe("paragraph");
      expect(doc.content.child(0).textContent).toBe("Hello world");
    });

    it("should convert HTML with heading", async () => {
      const html = "<h1>Title</h1><p>Content</p>";

      const doc = await DocumentConverter.htmlToProsemirror(html);

      expect(doc.content.childCount).toBe(2);
      expect(doc.content.child(0).type.name).toBe("heading");
      expect(doc.content.child(0).attrs.level).toBe(1);
      expect(doc.content.child(0).textContent).toBe("Title");
      expect(doc.content.child(1).type.name).toBe("paragraph");
    });

    it("should remove script tags", async () => {
      const html = "<p>Safe content</p><script>alert('xss')</script>";

      const doc = await DocumentConverter.htmlToProsemirror(html);

      expect(doc.textContent).toBe("Safe content");
      expect(doc.textContent).not.toContain("alert");
    });

    it("should remove style tags", async () => {
      const html = "<style>body { color: red; }</style><p>Content</p>";

      const doc = await DocumentConverter.htmlToProsemirror(html);

      expect(doc.textContent).toBe("Content");
      expect(doc.textContent).not.toContain("color");
    });

    it("should handle Buffer input", async () => {
      const html = Buffer.from("<p>From buffer</p>", "utf8");

      const doc = await DocumentConverter.htmlToProsemirror(html);

      expect(doc.content.child(0).textContent).toBe("From buffer");
    });

    it("should convert HTML with lists", async () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";

      const doc = await DocumentConverter.htmlToProsemirror(html);

      expect(doc.content.childCount).toBe(1);
      expect(doc.content.child(0).type.name).toBe("bullet_list");
      expect(doc.content.child(0).content.childCount).toBe(2);
    });

    it("should convert HTML with bold and italic", async () => {
      const html = "<p><strong>Bold</strong> and <em>italic</em></p>";

      const doc = await DocumentConverter.htmlToProsemirror(html);

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

    it("should handle full HTML document", async () => {
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

      const doc = await DocumentConverter.htmlToProsemirror(html);

      expect(doc.content.childCount).toBe(2);
      expect(doc.content.child(0).type.name).toBe("heading");
      expect(doc.content.child(0).textContent).toBe("Document Title");
      expect(doc.content.child(1).type.name).toBe("paragraph");
      expect(doc.content.child(1).textContent).toBe("Paragraph content");
    });

    it("should remove emoticon images", async () => {
      const html = `<p>Hello <img class="emoticon" src="smile.png" alt=":)"> world</p>`;

      const doc = await DocumentConverter.htmlToProsemirror(html);

      // Emoticon image should be removed, text content remains
      expect(doc.textContent).not.toContain(":)");
      expect(doc.textContent).toContain("Hello");
      expect(doc.textContent).toContain("world");
    });

    it("should remove Jira icon images", async () => {
      const html = `
        <p>Issue: <span class="jira-issue-key"><img class="icon" src="icon.png">ABC-123</span></p>
      `;

      const doc = await DocumentConverter.htmlToProsemirror(html);

      expect(doc.textContent).toBe("Issue: ABC-123");
    });

    it("should apply Confluence image sizing", async () => {
      const html = `
        <p><img src="image.png" data-width="800" data-height="600" width="400"></p>
      `;

      const doc = await DocumentConverter.htmlToProsemirror(html);

      const paragraph = doc.content.child(0);
      const image = paragraph.content.child(0);
      expect(image.type.name).toBe("image");
      expect(image.attrs.width).toBe(400);
      expect(image.attrs.height).toBe(300);
    });

    it("should extract dimensions from PNG data URI images", async () => {
      // Minimal 2x3 PNG (IHDR: width=2, height=3)
      const pngBuffer = Buffer.alloc(33);
      // PNG signature
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(
        pngBuffer
      );
      // IHDR chunk length (13 bytes)
      pngBuffer.writeUInt32BE(13, 8);
      // "IHDR"
      Buffer.from("IHDR").copy(pngBuffer, 12);
      // Width = 200
      pngBuffer.writeUInt32BE(200, 16);
      // Height = 150
      pngBuffer.writeUInt32BE(150, 20);

      const base64 = pngBuffer.toString("base64");
      const html = `<p><img src="data:image/png;base64,${base64}"></p>`;

      const doc = await DocumentConverter.htmlToProsemirror(html);

      const paragraph = doc.content.child(0);
      const image = paragraph.content.child(0);
      expect(image.type.name).toBe("image");
      expect(image.attrs.width).toBe(200);
      expect(image.attrs.height).toBe(150);
    });

    it("should extract dimensions from JPEG data URI images", async () => {
      // Minimal JPEG with SOF0 marker
      const jpegBuffer = Buffer.alloc(20);
      // JPEG SOI marker
      jpegBuffer[0] = 0xff;
      jpegBuffer[1] = 0xd8;
      // SOF0 marker
      jpegBuffer[2] = 0xff;
      jpegBuffer[3] = 0xc0;
      // Segment length
      jpegBuffer.writeUInt16BE(17, 4);
      // Precision
      jpegBuffer[6] = 8;
      // Height = 300
      jpegBuffer.writeUInt16BE(300, 7);
      // Width = 400
      jpegBuffer.writeUInt16BE(400, 9);

      const base64 = jpegBuffer.toString("base64");
      const html = `<p><img src="data:image/jpeg;base64,${base64}"></p>`;

      const doc = await DocumentConverter.htmlToProsemirror(html);

      const paragraph = doc.content.child(0);
      const image = paragraph.content.child(0);
      expect(image.type.name).toBe("image");
      expect(image.attrs.width).toBe(400);
      expect(image.attrs.height).toBe(300);
    });

    it("should extract dimensions from GIF data URI images", async () => {
      // Minimal GIF header
      const gifBuffer = Buffer.alloc(10);
      // GIF signature
      Buffer.from("GIF89a").copy(gifBuffer);
      // Width = 320 (little-endian)
      gifBuffer.writeUInt16LE(320, 6);
      // Height = 240 (little-endian)
      gifBuffer.writeUInt16LE(240, 8);

      const base64 = gifBuffer.toString("base64");
      const html = `<p><img src="data:image/gif;base64,${base64}"></p>`;

      const doc = await DocumentConverter.htmlToProsemirror(html);

      const paragraph = doc.content.child(0);
      const image = paragraph.content.child(0);
      expect(image.type.name).toBe("image");
      expect(image.attrs.width).toBe(320);
      expect(image.attrs.height).toBe(240);
    });

    it("should not override existing width/height on data URI images", async () => {
      // PNG with dimensions 200x150 but HTML attributes say 100x75
      const pngBuffer = Buffer.alloc(33);
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(
        pngBuffer
      );
      pngBuffer.writeUInt32BE(13, 8);
      Buffer.from("IHDR").copy(pngBuffer, 12);
      pngBuffer.writeUInt32BE(200, 16);
      pngBuffer.writeUInt32BE(150, 20);

      const base64 = pngBuffer.toString("base64");
      const html = `<p><img src="data:image/png;base64,${base64}" width="100" height="75"></p>`;

      const doc = await DocumentConverter.htmlToProsemirror(html);

      const paragraph = doc.content.child(0);
      const image = paragraph.content.child(0);
      expect(image.type.name).toBe("image");
      // Should use the HTML attributes, not the parsed dimensions
      expect(image.attrs.width).toBe(100);
      expect(image.attrs.height).toBe(75);
    });
  });
});
