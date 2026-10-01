import fs from "fs-extra";
import { vi } from "vitest";
import { Attachment, DocumentTag, Tag } from "@server/models";
import ZipHelper from "@server/utils/ZipHelper";
import {
  buildCollection,
  buildDocument,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import type { CollectionJSONExport } from "@server/types";
import ExportJSONTask from "./ExportJSONTask";

async function readZipContents(
  filePath: string
): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};
  await ZipHelper.walk(filePath, async (entry) => {
    if (!entry.isDirectory) {
      contents[entry.fileName] = (await entry.readBuffer(1024 * 1024)).toString(
        "utf8"
      );
    }
  });
  return contents;
}

describe("ExportJSONTask", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not query attachments when no attachment IDs are present", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: user.id,
      description: "No attachments",
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      text: "No attachments",
    });
    await collection.addDocumentToStructure(document);
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });
    const findAll = vi.spyOn(Attachment, "findAll");

    const filePath = await new ExportJSONTask().exportCollections(
      [collection],
      fileOperation
    );

    try {
      expect(findAll).not.toHaveBeenCalled();
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should include tag names on exported documents", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    await collection.addDocumentToStructure(document);

    const [tag] = await Tag.findOrCreate({
      where: { teamId: team.id, name: "export-tag" },
      defaults: { teamId: team.id, name: "export-tag" },
    });
    await DocumentTag.create({ tagId: tag.id, documentId: document.id });

    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const filePath = await new ExportJSONTask().exportCollections(
      [collection],
      fileOperation
    );

    try {
      const contents = await readZipContents(filePath);
      const [collectionFileName] = Object.keys(contents).filter(
        (name) => name !== "metadata.json"
      );
      const exported: CollectionJSONExport = JSON.parse(
        contents[collectionFileName]
      );
      expect(exported.documents[document.id].tags).toEqual(["export-tag"]);
    } finally {
      await fs.remove(filePath);
    }
  });
  it("should load the tags of a collection's documents in one query", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: user.id,
    });
    const [tag] = await Tag.findOrCreate({
      where: { teamId: team.id, name: "batched" },
      defaults: { teamId: team.id, name: "batched" },
    });
    const documents = [];
    for (let i = 0; i < 3; i++) {
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
      });
      await collection.addDocumentToStructure(document);
      await DocumentTag.create({ tagId: tag.id, documentId: document.id });
      documents.push(document);
    }
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });
    const findAll = vi.spyOn(DocumentTag, "findAll");

    const filePath = await new ExportJSONTask().exportCollections(
      [collection],
      fileOperation
    );

    try {
      expect(findAll).toHaveBeenCalledTimes(1);
      const contents = await readZipContents(filePath);
      const [collectionFileName] = Object.keys(contents).filter(
        (name) => name !== "metadata.json"
      );
      const exported: CollectionJSONExport = JSON.parse(
        contents[collectionFileName]
      );
      for (const document of documents) {
        expect(exported.documents[document.id].tags).toEqual(["batched"]);
      }
    } finally {
      await fs.remove(filePath);
    }
  });
});
