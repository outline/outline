import { randomUUID } from "node:crypto";
import fs from "fs-extra";
import JSZip from "jszip";
import tmp from "tmp";
import type { ProsemirrorDoc } from "@shared/types";
import { Collection, Document, ImportTask } from "@server/models";
import FileStorage from "@server/storage/files";
import {
  ImportState,
  ImportTaskPhase,
  ImportTaskState,
  IntegrationService,
} from "@shared/types";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildImport,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import MarkdownImportsProcessor from "../processors/MarkdownImportsProcessor";
import MarkdownAPIImportTask, {
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

describe("MarkdownImportsProcessor legacy task input", () => {
  it("assigns documents using collectionExternalId from tasks queued before the rename", async () => {
    const admin = await buildAdmin();
    const emptyDoc: ProsemirrorDoc = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
    const rootId = randomUUID();
    const docId = randomUUID();

    const importModel = await buildImport({
      teamId: admin.teamId,
      createdById: admin.id,
      service: IntegrationService.Markdown,
      integrationId: null,
      input: [{ externalId: rootId }],
      scratch: { storageKey: "fixture-key" },
      state: ImportState.Processed,
    });

    await ImportTask.create<ImportTask<IntegrationService.Markdown>>({
      state: ImportTaskState.Completed,
      phase: ImportTaskPhase.Page,
      importId: importModel.id,
      input: [
        { externalId: rootId },
        { externalId: docId, collectionExternalId: rootId },
      ],
      output: [
        { externalId: rootId, title: "Legacy", content: emptyDoc },
        { externalId: docId, title: "Legacy doc", content: emptyDoc },
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

    const collection = await Collection.findOne({
      where: { apiImportId: importModel.id },
    });
    const document = await Document.findOne({
      where: { apiImportId: importModel.id },
    });
    expect(document?.collectionId).toBe(collection?.id);
  });
});

describe("MarkdownAPIImportTask document export archives", () => {
  /** An archive with the layout of a document export. */
  const documentExport = {
    "Parent.md":
      "# Parent\n\nParent body\n\n![pic](Parent/attachments/pic.png)\n",
    "Parent/Child.md": "# Child\n\n[up](../Parent.md)",
    "Parent/attachments/pic.png": "pixels",
  };

  /**
   * Imports an archive with the given files.
   *
   * @param admin The user that creates the import.
   * @param files The contents of the archive, keyed by path.
   * @param destination The destination of the import, if any.
   * @returns The documents and collections created by the import.
   */
  async function importArchive(
    admin: Awaited<ReturnType<typeof buildAdmin>>,
    files: Record<string, string>,
    destination: { collectionId?: string; documentId?: string } = {}
  ) {
    const zip = new JSZip();
    for (const [name, content] of Object.entries(files)) {
      zip.file(name, content);
    }
    const filePath: string = await new Promise((resolve, reject) => {
      tmp.file({ postfix: ".zip" }, (err, p) =>
        err ? reject(err) : resolve(p)
      );
    });
    await fs.writeFile(
      filePath,
      await zip.generateAsync({ type: "nodebuffer" })
    );

    vi.spyOn(FileStorage, "getFileHandle").mockResolvedValue({
      path: filePath,
      cleanup: async () => {},
    });
    vi.spyOn(MarkdownAPIImportTask.prototype, "schedule").mockResolvedValue(
      undefined as never
    );

    const externalId = randomUUID();
    const importModel = await buildImport({
      teamId: admin.teamId,
      createdById: admin.id,
      service: IntegrationService.Markdown,
      integrationId: null,
      ...destination,
      input: [{ externalId }],
      scratch: { storageKey: "fixture-key" },
    });
    const bootstrapTask = await ImportTask.create<
      ImportTask<IntegrationService.Markdown>
    >({
      state: ImportTaskState.Created,
      phase: ImportTaskPhase.Bootstrap,
      input: [{ externalId }],
      importId: importModel.id,
    } as Parameters<typeof ImportTask.create>[0]);

    await new MarkdownAPIImportTask().perform({
      importTaskId: bootstrapTask.id,
    });
    const findNext = () =>
      ImportTask.findOne<ImportTask<IntegrationService.Markdown>>({
        where: { state: ImportTaskState.Created, importId: importModel.id },
        order: [["createdAt", "ASC"]],
      });
    for (let task = await findNext(); task; task = await findNext()) {
      await new MarkdownAPIImportTask().perform({ importTaskId: task.id });
    }
    await new MarkdownAPIImportTask().perform({
      importTaskId: bootstrapTask.id,
    });

    await new MarkdownImportsProcessor().perform({
      name: "imports.processed",
      modelId: importModel.id,
      teamId: admin.teamId,
      actorId: admin.id,
      ip: "127.0.0.1",
      changes: { attributes: {}, previous: {} },
    });
    await fs.rm(filePath, { force: true });

    return {
      documents: await Document.findAll({
        where: { apiImportId: importModel.id },
      }),
      collections: await Collection.findAll({
        where: { apiImportId: importModel.id },
      }),
    };
  }

  it("merges a document with its folder when importing into a collection", async () => {
    const admin = await buildAdmin();
    const destination = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
    });

    const { documents, collections } = await importArchive(
      admin,
      documentExport,
      { collectionId: destination.id }
    );

    expect(collections).toHaveLength(0);
    expect(documents.map((d) => d.title).sort()).toEqual(["Child", "Parent"]);

    const parent = documents.find((d) => d.title === "Parent");
    const child = documents.find((d) => d.title === "Child");
    expect(parent?.parentDocumentId).toBeNull();
    expect(parent?.text).toContain("Parent body");
    expect(child?.parentDocumentId).toBe(parent?.id);
    expect(child?.text).toContain(`/doc/${parent?.id}`);
  });

  it("merges a document with its folder when importing under a document", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
    });
    const destination = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
      collectionId: collection.id,
    });

    const { documents } = await importArchive(admin, documentExport, {
      documentId: destination.id,
    });

    expect(documents.map((d) => d.title).sort()).toEqual(["Child", "Parent"]);
    const parent = documents.find((d) => d.title === "Parent");
    const child = documents.find((d) => d.title === "Child");
    expect(parent?.parentDocumentId).toBe(destination.id);
    expect(child?.parentDocumentId).toBe(parent?.id);
  });

  it("uses the file as the collection overview when creating new collections", async () => {
    const admin = await buildAdmin();

    const { documents, collections } = await importArchive(
      admin,
      documentExport
    );

    expect(collections.map((c) => c.name)).toEqual(["Parent"]);
    const [collection] = collections;
    expect(collection.description).toContain("Parent body");
    expect(collection.description).not.toContain("# Parent");
    expect(collection.description).toContain("/api/attachments.redirect");

    expect(documents.map((d) => d.title)).toEqual(["Child"]);
    const [child] = documents;
    expect(child.collectionId).toBe(collection.id);
    expect(child.parentDocumentId).toBeNull();
    expect(child.text).toContain(collection.id);
  });

  it("keeps a file without a matching folder in the fallback collection", async () => {
    const admin = await buildAdmin();

    const { documents, collections } = await importArchive(admin, {
      "Loose.md": "# Loose\n\nLoose body",
      "Parent/Child.md": "# Child\n\nChild body",
    });

    expect(collections.map((c) => c.name).sort()).toEqual([
      "Documents",
      "Parent",
    ]);
    expect(documents.map((d) => d.title).sort()).toEqual(["Child", "Loose"]);
    expect(
      collections.find((c) => c.name === "Parent")?.description
    ).toBeFalsy();
  });

  it("deletes the children of an archived document when the import is deleted", async () => {
    const admin = await buildAdmin();
    const destination = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
    });

    const { documents } = await importArchive(admin, documentExport, {
      collectionId: destination.id,
    });
    const importId = documents[0].apiImportId;
    if (!importId) {
      throw new Error("Expected the document to belong to the import");
    }
    const parent = documents.find((d) => d.title === "Parent");
    if (!parent) {
      throw new Error("Expected the parent document to be imported");
    }
    const archivable = await Document.findByPk(parent.id, {
      userId: admin.id,
      rejectOnEmpty: true,
    });
    await withAPIContext(admin, (ctx) => archivable.archiveWithCtx(ctx));

    await new MarkdownImportsProcessor().perform({
      name: "imports.delete",
      modelId: importId,
      teamId: admin.teamId,
      actorId: admin.id,
      ip: "127.0.0.1",
      changes: { attributes: {}, previous: {} },
    });

    expect(await Document.count({ where: { apiImportId: importId } })).toBe(0);
    expect(await Collection.findByPk(destination.id)).not.toBeNull();
  });
});
