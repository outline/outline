import {
  rewriteAttachmentPaths,
  rewriteInternalLinks,
} from "./MarkdownAPIImportTask";

describe("rewriteAttachmentPaths", () => {
  it("replaces a direct encoded path with the placeholder", () => {
    const out = rewriteAttachmentPaths(
      "![alt](My%20Collection/attachments/foo.png)",
      [{ id: "att-1", pathInZip: "My Collection/attachments/foo.png" }]
    );
    expect(out).toBe("![alt](<<att-1>>)");
  });

  it("normalizes legacy `uploads/` bucket layout", () => {
    const out = rewriteAttachmentPaths("![x](./uploads/abc/file.png)", [
      {
        id: "att-2",
        pathInZip: "Some Collection/uploads/abc/file.png",
      },
    ]);
    expect(out).toBe("![x](<<att-2>>)");
  });

  it("normalizes legacy `public/` bucket layout", () => {
    const out = rewriteAttachmentPaths("![x](./public/abc/file.png)", [
      {
        id: "att-3",
        pathInZip: "Some Collection/public/abc/file.png",
      },
    ]);
    expect(out).toBe("![x](<<att-3>>)");
  });

  it("handles arbitrary folder names like 'attachments/'", () => {
    const out = rewriteAttachmentPaths("![x](./attachments/foo.png)", [
      { id: "att-4", pathInZip: "Collection/attachments/foo.png" },
    ]);
    expect(out).toBe("![x](<<att-4>>)");
  });

  it("matches nested attachments folders", () => {
    const out = rewriteAttachmentPaths("![x](./attachments/sub/bar.png)", [
      {
        id: "att-5",
        pathInZip: "Collection/Doc/attachments/sub/bar.png",
      },
    ]);
    expect(out).toBe("![x](<<att-5>>)");
  });

  it("substitutes multiple references in the same document", () => {
    const out = rewriteAttachmentPaths(
      "![a](./attachments/a.png) and ![b](./attachments/b.png)",
      [
        { id: "id-a", pathInZip: "C/attachments/a.png" },
        { id: "id-b", pathInZip: "C/attachments/b.png" },
      ]
    );
    expect(out).toBe("![a](<<id-a>>) and ![b](<<id-b>>)");
  });

  it("is a no-op when no attachments match", () => {
    const out = rewriteAttachmentPaths("![x](https://example.com/a.png)", [
      { id: "id-a", pathInZip: "C/attachments/a.png" },
    ]);
    expect(out).toBe("![x](https://example.com/a.png)");
  });
});

describe("rewriteInternalLinks", () => {
  it("rewrites a sibling .md link to a placeholder", () => {
    const out = rewriteInternalLinks(
      "see [other](./other.md)",
      "Collection/parent.md",
      { "Collection/other.md": "doc-1" }
    );
    expect(out).toBe("see [other](<<doc-1>>)");
  });

  it("rewrites a nested .md link", () => {
    const out = rewriteInternalLinks(
      "see [child](./sub/child.md)",
      "Collection/parent.md",
      { "Collection/sub/child.md": "doc-2" }
    );
    expect(out).toBe("see [child](<<doc-2>>)");
  });

  it("leaves unresolved .md links untouched", () => {
    const out = rewriteInternalLinks(
      "see [missing](./missing.md)",
      "Collection/parent.md",
      {}
    );
    expect(out).toBe("see [missing](./missing.md)");
  });

  it("ignores non-md links", () => {
    const out = rewriteInternalLinks(
      "see [site](https://example.com)",
      "Collection/parent.md",
      { "Collection/parent.md": "doc-self" }
    );
    expect(out).toBe("see [site](https://example.com)");
  });

  it("decodes encoded path segments before lookup", () => {
    const out = rewriteInternalLinks(
      "see [other](./My%20Doc.md)",
      "Collection/parent.md",
      { "Collection/My Doc.md": "doc-3" }
    );
    expect(out).toBe("see [other](<<doc-3>>)");
  });
});
