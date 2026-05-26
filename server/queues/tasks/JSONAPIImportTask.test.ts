import { randomUUID } from "node:crypto";
import fs from "fs-extra";
import JSZip from "jszip";
import tmp from "tmp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Attachment,
  Collection,
  Document,
  ImportTask,
  User,
} from "@server/models";
import FileStorage from "@server/storage/files";
import {
  CollectionPermission,
  ImportTaskPhase,
  ImportTaskState,
  IntegrationService,
} from "@shared/types";
import {
  buildAdmin,
  buildDocument,
  buildImport,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import JSONImportsProcessor from "../processors/JSONImportsProcessor";
import JSONAPIImportTask, {
  rewriteAttachmentReferences,
} from "./JSONAPIImportTask";

// Fixed external IDs and email used across the user-mapping tests — these
// are the values written into every freshly generated zip.
const FIXTURE_USER_ID = "ccec260a-e060-4925-ade8-17cfabaf2cac";
const FIXTURE_USER_EMAIL = "hmac.devo@gmail.com";

interface BuiltZip {
  filePath: string;
  documentOneUrlId: string;
  documentTwoUrlId: string;
  cleanup: () => Promise<void>;
}

/**
 * Builds a self-contained JSON export zip in a tmp file. Each call produces
 * fresh urlIds and document ids so concurrent tests (across files) never
 * collide on `urlId` uniqueness. The structure matches what ExportJSONTask
 * produces: a single collection JSON + metadata.json at the zip root,
 * documents carrying source user attribution, plus one referenced
 * attachment.
 */
async function buildJSONExportZip(): Promise<BuiltZip> {
  const collectionExternalId = randomUUID();
  const collectionUrlId = randomUrlId();
  const documentOneId = randomUUID();
  const documentOneUrlId = randomUrlId();
  const documentTwoId = randomUUID();
  const documentTwoUrlId = randomUrlId();
  const attachmentExternalId = randomUUID();
  const attachmentKey = `uploads/${FIXTURE_USER_ID}/${attachmentExternalId}/pikachu.jpg`;

  const collectionExport = {
    collection: {
      id: collectionExternalId,
      urlId: collectionUrlId,
      name: "Test JSON",
      data: { type: "doc", content: [{ type: "paragraph" }] },
      sort: { field: "index", direction: "asc" },
      icon: "beaker",
      color: "#FF825C",
      permission: null,
      documentStructure: [
        { id: documentOneId, title: "Document 1", children: [] },
        { id: documentTwoId, title: "Document 2", children: [] },
      ],
    },
    documents: {
      [documentOneId]: {
        id: documentOneId,
        urlId: documentOneUrlId,
        title: "Document 1",
        icon: null,
        color: null,
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Some random text" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "see doc two",
                  marks: [
                    {
                      type: "link",
                      attrs: {
                        href: `/doc/document-2-${documentTwoUrlId}`,
                        title: null,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "see collection",
                  marks: [
                    {
                      type: "link",
                      attrs: {
                        href: `/collection/test-json-${collectionUrlId}`,
                        title: null,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "image",
                  attrs: {
                    src: `/api/attachments.redirect?id=${attachmentExternalId}`,
                    alt: null,
                    layoutClass: null,
                    title: null,
                  },
                },
              ],
            },
          ],
        },
        createdById: FIXTURE_USER_ID,
        createdByName: "hmac.devo",
        createdByEmail: FIXTURE_USER_EMAIL,
        createdAt: "2024-07-18T18:03:41.622Z",
        updatedAt: "2024-07-18T18:04:46.133Z",
        publishedAt: "2024-07-18T18:03:45.710Z",
        fullWidth: false,
        parentDocumentId: null,
      },
      [documentTwoId]: {
        id: documentTwoId,
        urlId: documentTwoUrlId,
        title: "Document 2",
        icon: null,
        color: null,
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Doc two body" }],
            },
          ],
        },
        createdById: FIXTURE_USER_ID,
        createdByName: "hmac.devo",
        createdByEmail: FIXTURE_USER_EMAIL,
        createdAt: "2024-07-18T18:03:41.622Z",
        updatedAt: "2024-07-18T18:04:46.133Z",
        publishedAt: "2024-07-18T18:03:45.710Z",
        fullWidth: false,
        parentDocumentId: null,
      },
    },
    attachments: {
      [attachmentExternalId]: {
        id: attachmentExternalId,
        documentId: documentOneId,
        contentType: "image/jpeg",
        name: "pikachu.jpg",
        size: 6,
        key: attachmentKey,
      },
    },
  };

  const metadata = {
    exportVersion: 1,
    version: "0.78.0-0",
    createdAt: "2024-07-18T18:18:14.221Z",
    createdById: FIXTURE_USER_ID,
    createdByEmail: FIXTURE_USER_EMAIL,
  };

  const zip = new JSZip();
  zip.file("metadata.json", JSON.stringify(metadata));
  zip.file("Test JSON.json", JSON.stringify(collectionExport));
  zip.file(attachmentKey, Buffer.from("pixels"));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const filePath: string = await new Promise((resolve, reject) => {
    tmp.file({ postfix: ".zip" }, (err, p) => (err ? reject(err) : resolve(p)));
  });
  await fs.writeFile(filePath, buffer);

  return {
    filePath,
    documentOneUrlId,
    documentTwoUrlId,
    cleanup: async () => {
      await fs.rm(filePath, { force: true }).catch(() => {});
    },
  };
}

function randomUrlId(): string {
  return Math.random().toString(36).slice(2, 12).padEnd(10, "x").slice(0, 10);
}

/**
 * Drives a JSON import end-to-end against an in-memory fixture: runs the
 * bootstrap task, every subsequent per-page wave, then invokes the
 * `imports.processed` handler so collections/documents/attachments land.
 */
async function runImport(opts: {
  teamId: string;
  createdById: string;
  zipPath: string;
}): Promise<{ importId: string }> {
  vi.spyOn(FileStorage, "getFileHandle").mockResolvedValue({
    path: opts.zipPath,
    cleanup: async () => {},
  });

  const importModel = await buildImport({
    teamId: opts.teamId,
    createdById: opts.createdById,
    service: IntegrationService.JSON,
    integrationId: null,
    input: [
      { externalId: randomUUID(), permission: CollectionPermission.Read },
    ],
    scratch: { storageKey: "fixture-key" },
  });

  // Seed the bootstrap row that JSONImportsProcessor would have created.
  const placeholderExternalId = (importModel.input[0] as { externalId: string })
    .externalId;
  const bootstrapTask = await ImportTask.create<
    ImportTask<IntegrationService.JSON>
  >({
    state: ImportTaskState.Created,
    phase: ImportTaskPhase.Bootstrap,
    input: [{ externalId: placeholderExternalId }],
    importId: importModel.id,
  } as Parameters<typeof ImportTask.create>[0]);

  // Bull's schedule() would queue follow-on work. Drive it inline by
  // re-running perform() against every Created task in createdAt order.
  vi.spyOn(JSONAPIImportTask.prototype, "schedule").mockResolvedValue(
    undefined as never
  );

  await new JSONAPIImportTask().perform({ importTaskId: bootstrapTask.id });

  let remaining = await ImportTask.findOne<ImportTask<IntegrationService.JSON>>(
    {
      where: { state: ImportTaskState.Created, importId: importModel.id },
      order: [["createdAt", "ASC"]],
    }
  );
  while (remaining) {
    await new JSONAPIImportTask().perform({ importTaskId: remaining.id });
    remaining = await ImportTask.findOne<ImportTask<IntegrationService.JSON>>({
      where: { state: ImportTaskState.Created, importId: importModel.id },
      order: [["createdAt", "ASC"]],
    });
  }

  // Once all per-task work is done, APIImportTask transitions the Import to
  // Processed and fires the persistence pass via JSONImportsProcessor.
  await new JSONAPIImportTask().perform({
    importTaskId: bootstrapTask.id,
  });

  await new JSONImportsProcessor().perform({
    name: "imports.processed",
    modelId: importModel.id,
    teamId: opts.teamId,
    actorId: opts.createdById,
    ip: "127.0.0.1",
    changes: { attributes: {}, previous: {} },
  });

  return { importId: importModel.id };
}

describe("JSONAPIImportTask", () => {
  let zip: BuiltZip;

  beforeEach(async () => {
    zip = await buildJSONExportZip();
  });

  afterEach(async () => {
    await zip.cleanup();
  });

  it("imports collections, documents and attachments from the fixture", async () => {
    const admin = await buildAdmin();
    const { importId } = await runImport({
      teamId: admin.teamId,
      createdById: admin.id,
      zipPath: zip.filePath,
    });

    const collections = await Collection.findAll({
      where: { apiImportId: importId },
    });
    const documents = await Document.findAll({
      where: { apiImportId: importId },
    });
    const attachments = await Attachment.findAll({
      where: { teamId: admin.teamId },
    });

    expect(collections.length).toBe(1);
    expect(documents.length).toBe(2);
    expect(attachments.length).toBeGreaterThanOrEqual(1);
  });

  it("rewrites internal document links to the new urlIds", async () => {
    const admin = await buildAdmin();
    // Pre-create a document with the exported urlId so the importer is
    // forced to allocate a fresh urlId for Document 2. Without a collision
    // the original urlId would be preserved and link rewriting wouldn't be
    // exercised end-to-end.
    await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
      urlId: zip.documentTwoUrlId,
    });

    const { importId } = await runImport({
      teamId: admin.teamId,
      createdById: admin.id,
      zipPath: zip.filePath,
    });

    const documents = await Document.findAll({
      where: { apiImportId: importId },
      order: [["title", "ASC"]],
    });
    expect(documents.length).toBe(2);
    const docOne = documents.find((d) => d.title === "Document 1");
    const docTwo = documents.find((d) => d.title === "Document 2");
    expect(docOne).toBeDefined();
    expect(docTwo).toBeDefined();
    expect(docTwo!.urlId).not.toBe(zip.documentTwoUrlId);

    const linkParagraph = docOne!.content?.content?.[1];
    const linkText = linkParagraph?.content?.[0];
    const linkMark = linkText?.marks?.find((m) => m.type === "link");
    expect(linkMark?.attrs?.href).toBe(`/doc/document-2-${docTwo!.urlId}`);
    expect(linkMark?.attrs?.href).not.toContain(zip.documentTwoUrlId);
  });

  it("rewrites internal collection links to slugged collection paths", async () => {
    const admin = await buildAdmin();
    const { importId } = await runImport({
      teamId: admin.teamId,
      createdById: admin.id,
      zipPath: zip.filePath,
    });

    const collection = await Collection.findOne({
      where: { apiImportId: importId },
      rejectOnEmpty: true,
    });
    const docOne = await Document.findOne({
      where: { apiImportId: importId, title: "Document 1" },
      rejectOnEmpty: true,
    });

    const linkParagraph = docOne.content?.content?.[2];
    const linkText = linkParagraph?.content?.[0];
    const linkMark = linkText?.marks?.find((m) => m.type === "link");
    expect(linkMark?.attrs?.href).toBe(collection.path);
  });

  describe("user mapping", () => {
    it("maps createdById to an existing user by ID", async () => {
      let originalAuthor = await User.findByPk(FIXTURE_USER_ID);
      const teamId = originalAuthor?.teamId ?? (await buildTeam()).id;
      if (!originalAuthor) {
        originalAuthor = await buildUser({ id: FIXTURE_USER_ID, teamId });
      }

      const admin = await buildAdmin({ teamId });
      const { importId } = await runImport({
        teamId,
        createdById: admin.id,
        zipPath: zip.filePath,
      });

      const documents = await Document.findAll({
        where: { apiImportId: importId },
      });
      expect(documents.length).toBe(2);
      for (const document of documents) {
        expect(document.createdById).toBe(originalAuthor.id);
        expect(document.lastModifiedById).toBe(originalAuthor.id);
      }
    });

    it("falls back to email matching when ID does not match", async () => {
      const team = await buildTeam();
      const originalAuthor = await buildUser({
        teamId: team.id,
        email: FIXTURE_USER_EMAIL,
      });
      const admin = await buildAdmin({ teamId: team.id });
      const { importId } = await runImport({
        teamId: team.id,
        createdById: admin.id,
        zipPath: zip.filePath,
      });

      const documents = await Document.findAll({
        where: { apiImportId: importId },
      });
      expect(documents.length).toBe(2);
      for (const document of documents) {
        expect(document.createdById).toBe(originalAuthor.id);
        expect(document.lastModifiedById).toBe(originalAuthor.id);
      }
    });

    it("falls back to importing user when no match is found", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const { importId } = await runImport({
        teamId: team.id,
        createdById: admin.id,
        zipPath: zip.filePath,
      });

      const documents = await Document.findAll({
        where: { apiImportId: importId },
      });
      expect(documents.length).toBe(2);
      for (const document of documents) {
        expect(document.createdById).toBe(admin.id);
        expect(document.lastModifiedById).toBe(admin.id);
      }
    });

    it("does not match users from a different team", async () => {
      const team = await buildTeam();
      const otherTeam = await buildTeam();
      await buildUser({
        teamId: otherTeam.id,
        email: FIXTURE_USER_EMAIL,
      });
      const admin = await buildAdmin({ teamId: team.id });
      const { importId } = await runImport({
        teamId: team.id,
        createdById: admin.id,
        zipPath: zip.filePath,
      });

      const documents = await Document.findAll({
        where: { apiImportId: importId },
      });
      expect(documents.length).toBe(2);
      for (const document of documents) {
        expect(document.createdById).toBe(admin.id);
      }
    });
  });
});

describe("rewriteAttachmentReferences", () => {
  it("rewrites image src to new attachment id", () => {
    const out = rewriteAttachmentReferences(
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: {
                  src: "/api/attachments.redirect?id=external-1",
                  alt: null,
                },
              },
            ],
          },
        ],
      },
      { "external-1": "new-1" }
    );
    const image = out.content?.[0].content?.[0];
    expect(image?.attrs?.src).toBe("/api/attachments.redirect?id=new-1");
  });

  it("rewrites attachment node href and id together", () => {
    const out = rewriteAttachmentReferences(
      {
        type: "doc",
        content: [
          {
            type: "attachment",
            attrs: {
              id: "external-2",
              href: "/api/attachments.redirect?id=external-2",
              title: "a.pdf",
            },
          },
        ],
      },
      { "external-2": "new-2" }
    );
    const attachment = out.content?.[0];
    expect(attachment?.attrs?.href).toBe("/api/attachments.redirect?id=new-2");
    expect(attachment?.attrs?.id).toBe("new-2");
  });

  it("leaves unknown references untouched", () => {
    const out = rewriteAttachmentReferences(
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: {
                  src: "/api/attachments.redirect?id=does-not-exist",
                },
              },
            ],
          },
        ],
      },
      { "external-1": "new-1" }
    );
    const image = out.content?.[0].content?.[0];
    expect(image?.attrs?.src).toBe(
      "/api/attachments.redirect?id=does-not-exist"
    );
  });
});
