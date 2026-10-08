import { Readable } from "node:stream";
import fs from "fs-extra";
import { vi } from "vitest";
import FileStorage from "@server/storage/files";
import { DocumentConverter } from "@server/converters/DocumentConverter";
import ZipHelper from "@server/utils/ZipHelper";
import {
  buildAttachment,
  buildCollection,
  buildDocument,
  buildDocumentWithAttachment,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { buildZip } from "@server/test/support";
import ExportTextBundleZipTask from "./ExportTextBundleZipTask";

/** A 1x1 transparent PNG, used as attachment contents in the round trip. */
const PNG_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

describe("ExportTextBundleZipTask", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should write each document as a TextBundle directory", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const parent = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Parent",
    });
    await collection.addDocumentToStructure(parent);
    const child = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      parentDocumentId: parent.id,
      title: "Child",
    });
    await collection.addDocumentToStructure(child);

    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const task = new ExportTextBundleZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);

      // Nested documents keep the folder layout the markdown export uses, with
      // each document itself becoming a bundle directory.
      expect(Object.keys(contents).sort()).toEqual([
        `${collection.name}/Parent.textbundle/info.json`,
        `${collection.name}/Parent.textbundle/text.markdown`,
        `${collection.name}/Parent/Child.textbundle/info.json`,
        `${collection.name}/Parent/Child.textbundle/text.markdown`,
      ]);
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should declare the bundle as markdown in info.json", async () => {
    const { collection, document, fileOperation } =
      await buildDocumentWithAttachment();

    vi.spyOn(FileStorage, "getFileStream").mockResolvedValue(
      Readable.from(["bytes"])
    );

    const task = new ExportTextBundleZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);
      const info = JSON.parse(
        contents[`${collection.name}/${document.title}.textbundle/info.json`]
      );

      expect(info.version).toBe(2);
      expect(info.type).toBe("net.daringfireball.markdown");
      expect(info.transient).toBe(false);
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should write attachments into the bundle's assets folder", async () => {
    const { collection, document, attachment, fileOperation } =
      await buildDocumentWithAttachment();

    const getFileStream = vi
      .spyOn(FileStorage, "getFileStream")
      .mockResolvedValue(Readable.from(["image-", "bytes"]));

    const task = new ExportTextBundleZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);
      const bundle = `${collection.name}/${document.title}.textbundle`;

      expect(contents[`${bundle}/assets/${attachment.name}`]).toBe(
        "image-bytes"
      );
      // The spec requires assets to be referenced relative to the text file.
      expect(contents[`${bundle}/text.markdown`]).toContain(
        `assets/${attachment.name}`
      );
      expect(contents[`${bundle}/text.markdown`]).not.toContain(
        attachment.redirectUrl
      );
      expect(getFileStream).toHaveBeenCalledWith(attachment.key);
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should link between documents relative to the text file", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const target = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Target",
    });
    await collection.addDocumentToStructure(target);
    const source = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Source",
      text: `See [Target](${target.url})`,
    });
    await collection.addDocumentToStructure(source);

    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const task = new ExportTextBundleZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);
      const text =
        contents[`${collection.name}/Source.textbundle/text.markdown`];

      // The text file sits one level inside the bundle, so a sibling bundle is
      // reached by stepping out of it first.
      expect(text).toContain("../Target.textbundle");
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should produce a bundle the TextPack importer can read back", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const attachment = await buildAttachment(
      { teamId: team.id, userId: user.id, contentType: "image/png" },
      "photo.png"
    );
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Round Trip",
      icon: "🚀",
      text: `![image](${attachment.redirectUrl})`,
    });
    await collection.addDocumentToStructure(document);
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    vi.spyOn(FileStorage, "getFileStream").mockResolvedValue(
      Readable.from([PNG_PIXEL])
    );

    const task = new ExportTextBundleZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      // Repackage the exported bundle on its own, which is what a TextPack is.
      const bundle = `${collection.name}/${document.title}.textbundle/`;
      const files: Record<string, Buffer> = {};
      await ZipHelper.walk(filePath, async (entry) => {
        if (!entry.isDirectory && entry.fileName.startsWith(bundle)) {
          files[entry.fileName.slice(bundle.length)] = await entry.readBuffer(
            1024 * 1024
          );
        }
      });

      const result = await DocumentConverter.convert(
        await buildZip(files),
        `${document.title}.textpack`,
        "application/octet-stream"
      );

      expect(result.title).toEqual(document.title);
      // The icon is written into the title on export, so it has to come back
      // out of it rather than staying glued to the title.
      expect(result.icon).toEqual("🚀");
      // The asset resolves through the round trip rather than being left as a
      // dangling relative reference.
      expect(result.text).toContain("data:image/png;base64,");
      expect(result.text).not.toContain(`assets/${attachment.name}`);
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
