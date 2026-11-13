import fs from "fs-extra";
import { vi } from "vitest";
import { Attachment } from "@server/models";
import type { Collection } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildFileOperation,
  buildPersonalCollection,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import ExportJSONTask from "./ExportJSONTask";

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

  it("should only export a personal collection to its owner", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const shared = await buildCollection({ teamId: team.id, userId: admin.id });
    const ownPersonal = await buildPersonalCollection(admin);
    const otherPersonal = await buildPersonalCollection(
      await buildUser({ teamId: team.id })
    );
    const exportCollections = vi
      .spyOn(ExportJSONTask.prototype, "exportCollections")
      .mockResolvedValue("");
    const exported = async (collectionId?: string) => {
      const fileOperation = await buildFileOperation({
        teamId: team.id,
        userId: admin.id,
        collectionId,
        options: { includeAttachments: false, includePrivate: true },
      });
      exportCollections.mockClear();
      await new ExportJSONTask().loadDataAndExport(fileOperation, admin);
      const collections: Collection[] = exportCollections.mock.calls[0][0];
      return collections.map((collection) => collection.id);
    };

    const workspace = await exported();
    expect(workspace).toContain(shared.id);
    expect(workspace).not.toContain(ownPersonal.id);
    expect(workspace).not.toContain(otherPersonal.id);

    expect(await exported(ownPersonal.id)).toEqual([ownPersonal.id]);
    expect(await exported(otherPersonal.id)).toEqual([]);
  });
});
