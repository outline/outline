import fs from "fs-extra";
import { Attachment } from "@server/models";
import type { CollectionJSONExport } from "@server/types";
import ZipHelper from "@server/utils/ZipHelper";
import {
  buildCollection,
  buildDocument,
  buildEmoji,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import ExportJSONTask from "./ExportJSONTask";

describe("ExportJSONTask", () => {
  it("should include custom emojis referenced by content and icons", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const [inlineEmoji, iconEmoji, unusedEmoji] = await Promise.all([
      buildEmoji({ teamId: team.id, createdById: user.id, name: "inline" }),
      buildEmoji({ teamId: team.id, createdById: user.id, name: "icon" }),
      buildEmoji({ teamId: team.id, createdById: user.id, name: "unused" }),
    ]);
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
      name: "Emojis",
    });
    const documents = await Promise.all([
      buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        title: "Inline",
        text: `Hello :${inlineEmoji.id}: :smile:`,
      }),
      buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        title: "Icon",
        icon: iconEmoji.id,
      }),
    ]);
    for (const document of documents) {
      await collection.addDocumentToStructure(document);
    }
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const task = new ExportJSONTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const files = new Map<string, Buffer>();
      await ZipHelper.walk(filePath, async (entry) => {
        if (!entry.isDirectory) {
          files.set(entry.fileName, await entry.readBuffer(1024 * 1024));
        }
      });

      const output = JSON.parse(
        files.get("Emojis.json")!.toString("utf8")
      ) as CollectionJSONExport;

      expect(Object.keys(output.emojis ?? {}).sort()).toEqual(
        [inlineEmoji.id, iconEmoji.id].sort()
      );
      expect(output.emojis![inlineEmoji.id]).toEqual({
        id: inlineEmoji.id,
        name: "inline",
        attachmentId: inlineEmoji.attachmentId,
      });

      // The emoji image travels with the export so the importing workspace can
      // recreate it.
      const attachment = await Attachment.findByPk(inlineEmoji.attachmentId, {
        rejectOnEmpty: true,
      });
      expect(output.attachments[inlineEmoji.attachmentId]).toBeDefined();
      expect(files.has(attachment.key)).toBe(true);

      // Emojis the collection doesn't reference are not exported.
      expect(output.emojis![unusedEmoji.id]).toBeUndefined();
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should write a shared emoji image to the archive once", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const emoji = await buildEmoji({
      teamId: team.id,
      createdById: user.id,
      name: "shared",
    });
    const collections = await Promise.all([
      buildCollection({ teamId: team.id, createdById: user.id, name: "One" }),
      buildCollection({ teamId: team.id, createdById: user.id, name: "Two" }),
    ]);
    for (const collection of collections) {
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        text: `:${emoji.id}:`,
      });
      await collection.addDocumentToStructure(document);
    }
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const task = new ExportJSONTask();
    const filePath = await task.exportCollections(collections, fileOperation);

    try {
      const attachment = await Attachment.findByPk(emoji.attachmentId, {
        rejectOnEmpty: true,
      });
      const fileNames: string[] = [];
      await ZipHelper.walk(filePath, (entry) => {
        if (!entry.isDirectory) {
          fileNames.push(entry.fileName);
        }
      });

      expect(fileNames.filter((name) => name === attachment.key).length).toBe(
        1
      );

      // Both collection files still describe the emoji so either can be
      // imported on its own.
      for (const name of ["One.json", "Two.json"]) {
        expect(fileNames).toContain(name);
      }
    } finally {
      await fs.remove(filePath);
    }
  });
});
