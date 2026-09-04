import { randomUUID } from "node:crypto";
import type { ProsemirrorDoc } from "@shared/types";
import { Collection, Document, ImportTask } from "@server/models";
import {
  ImportState,
  ImportTaskPhase,
  ImportTaskState,
  IntegrationService,
} from "@shared/types";
import {
  buildAdmin,
  buildCollection,
  buildImport,
} from "@server/test/factories";
import MarkdownImportsProcessor from "../processors/MarkdownImportsProcessor";
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

  it("leaves remote signed URLs untouched so the base task can download them", () => {
    // Slab exports reference images as remote signed URLs rather than files
    // in the zip; these aren't in the manifest and must survive rewriting so
    // the per-page attachment upload step can fetch and re-host them.
    const signedUrl =
      "https://uploads.slab.com/posts/abc/image.png?Signature=xyz&Expires=123";
    const out = rewriteAttachmentPaths(`![x](${signedUrl})`, [
      { id: "id-a", pathInZip: "C/attachments/local.png" },
    ]);
    expect(out).toBe(`![x](${signedUrl})`);
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

  it("rewrites an angle bracketed link to a document with spaces", () => {
    const out = rewriteInternalLinks(
      "see [other](<./My Doc.md>)",
      "Collection/parent.md",
      { "Collection/My Doc.md": "doc-4" }
    );
    expect(out).toBe("see [other](<<doc-4>>)");
  });

  it("rewrites a link carrying a title, keeping the title", () => {
    const out = rewriteInternalLinks(
      'see [other](./other.md "The other one")',
      "Collection/parent.md",
      { "Collection/other.md": "doc-5" }
    );
    expect(out).toBe('see [other](<<doc-5>> "The other one")');
  });
});

describe("MarkdownImportsProcessor destination", () => {
  const emptyDoc: ProsemirrorDoc = {
    type: "doc",
    content: [{ type: "paragraph" }],
  };

  it("collapses a synthetic root node so loose files land under the destination collection", async () => {
    const admin = await buildAdmin();
    const destination = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
    });

    const rootId = randomUUID();
    const docAId = randomUUID();
    const docBId = randomUUID();

    const importModel = await buildImport({
      teamId: admin.teamId,
      createdById: admin.id,
      service: IntegrationService.Markdown,
      integrationId: null,
      collectionId: destination.id,
      // The synthetic "Documents" fallback root node holding loose files.
      input: [{ externalId: rootId, synthetic: true }],
      scratch: { storageKey: "fixture-key" },
      state: ImportState.Processed,
    });

    await ImportTask.create<ImportTask<IntegrationService.Markdown>>({
      state: ImportTaskState.Completed,
      phase: ImportTaskPhase.Page,
      importId: importModel.id,
      input: [
        { externalId: rootId },
        { externalId: docAId, rootExternalId: rootId },
        { externalId: docBId, rootExternalId: rootId },
      ],
      output: [
        { externalId: rootId, title: "Documents", content: emptyDoc },
        { externalId: docAId, title: "Loose A", content: emptyDoc },
        { externalId: docBId, title: "Loose B", content: emptyDoc },
      ],
    } as Parameters<typeof ImportTask.create>[0]);

    await new MarkdownImportsProcessor().perform({
      name: "imports.processed",
      modelId: importModel.id,
      teamId: admin.teamId,
      actorId: admin.id,
      ip: "127.0.0.1",
      changes: { attributes: {}, previous: {} },
    });

    // No collections created — the synthetic root materializes nothing.
    const collections = await Collection.findAll({
      where: { apiImportId: importModel.id },
    });
    expect(collections.length).toBe(0);

    const documents = await Document.findAll({
      where: { apiImportId: importModel.id },
    });
    expect(documents.length).toBe(2);
    for (const document of documents) {
      expect(document.collectionId).toBe(destination.id);
      // Loose files parent directly to the destination collection root.
      expect(document.parentDocumentId).toBeNull();
    }
    expect(documents.map((d) => d.title).sort()).toEqual([
      "Loose A",
      "Loose B",
    ]);
  });
});
