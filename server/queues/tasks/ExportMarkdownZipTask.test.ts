import { Readable } from "node:stream";
import fs from "fs-extra";
import { vi } from "vitest";
import FileStorage from "@server/storage/files";
import ZipHelper from "@server/utils/ZipHelper";
import {
  buildCollection,
  buildDocument,
  buildDocumentWithAttachment,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import ExportMarkdownZipTask from "./ExportMarkdownZipTask";

describe("ExportMarkdownZipTask", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("should stream attachment contents into the zip file", async () => {
    const { collection, attachment, fileOperation } =
      await buildDocumentWithAttachment();

    const getFileStream = vi
      .spyOn(FileStorage, "getFileStream")
      .mockResolvedValue(Readable.from(["image-", "bytes"]));

    const task = new ExportMarkdownZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);
      expect(contents[`${collection.name}/${attachment.key}`]).toBe(
        "image-bytes"
      );
      expect(getFileStream).toHaveBeenCalledWith(attachment.key);
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should fail the export when an attachment cannot be read", async () => {
    const { collection, fileOperation } = await buildDocumentWithAttachment();

    vi.spyOn(FileStorage, "getFileStream").mockRejectedValue(
      new Error("storage unavailable")
    );

    const task = new ExportMarkdownZipTask();
    await expect(
      task.exportCollections([collection], fileOperation)
    ).rejects.toThrow("storage unavailable");
  });

  it("should fail the export when an attachment read is interrupted", async () => {
    const { collection, fileOperation } = await buildDocumentWithAttachment();

    vi.spyOn(FileStorage, "getFileStream").mockResolvedValue(
      new Readable({
        read() {
          this.push("partial");
          this.destroy(new Error("connection reset"));
        },
      })
    );

    const task = new ExportMarkdownZipTask();
    await expect(
      task.exportCollections([collection], fileOperation)
    ).rejects.toThrow("connection reset");
  });

  it("should write an empty entry when an attachment is missing from storage", async () => {
    const { collection, attachment, fileOperation } =
      await buildDocumentWithAttachment();

    vi.spyOn(FileStorage, "getFileStream").mockResolvedValue(null);

    const task = new ExportMarkdownZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);
      expect(contents[`${collection.name}/${attachment.key}`]).toBe("");
    } finally {
      await fs.remove(filePath);
    }
  });
});

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
