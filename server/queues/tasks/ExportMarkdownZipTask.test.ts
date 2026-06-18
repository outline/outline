import fs from "fs-extra";
import ZipHelper from "@server/utils/ZipHelper";
import {
  buildCollection,
  buildDocument,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import ExportMarkdownZipTask from "./ExportMarkdownZipTask";

describe("ExportMarkdownZipTask", () => {
  it("should not duplicate documents in the zip file", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const documents = await Promise.all([
      buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        title: "Test1",
      }),
      buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        title: "Test2",
      }),
    ]);
    for (const document of documents) {
      await collection.addDocumentToStructure(document);
    }
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const task = new ExportMarkdownZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const fileNames: string[] = [];
      await ZipHelper.walk(filePath, (entry) => {
        if (!entry.isDirectory) {
          fileNames.push(entry.fileName);
        }
      });

      expect(fileNames.sort()).toEqual([
        `${collection.name}/Test1.md`,
        `${collection.name}/Test2.md`,
      ]);
    } finally {
      await fs.remove(filePath);
    }
  });
});
