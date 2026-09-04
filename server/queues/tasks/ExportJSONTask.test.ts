import fs from "fs-extra";
import { vi } from "vitest";
import { Attachment } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildFileOperation,
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
});
