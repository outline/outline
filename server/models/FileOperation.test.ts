import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  FileOperationFormat,
  FileOperationState,
  FileOperationType,
} from "@shared/types";
import { createContext } from "@server/context";
import {
  buildCollection,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { ValidateKey } from "@server/validation";
import FileOperation from "./FileOperation";

describe("FileOperation", () => {
  describe("createExport", () => {
    it("should create a team export with the requested options", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      const fileOperation = await FileOperation.createExport(
        createContext({ user }),
        { team, includeAttachments: false, includePrivate: false }
      );

      expect(fileOperation.type).toBe(FileOperationType.Export);
      expect(fileOperation.state).toBe(FileOperationState.Creating);
      expect(fileOperation.format).toBe(FileOperationFormat.MarkdownZip);
      expect(fileOperation.key).toContain(`uploads/${team.id}/`);
      expect(fileOperation.options).toEqual({
        includeAttachments: false,
        includePrivate: false,
      });
      expect(fileOperation.user.id).toBe(user.id);
    });

    it("should set the collection association for a collection export", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });

      const fileOperation = await FileOperation.createExport(
        createContext({ user }),
        { team, collection }
      );

      expect(fileOperation.collectionId).toBe(collection.id);
      expect(fileOperation.collection?.id).toBe(collection.id);
      expect(fileOperation.options).toEqual({
        includeAttachments: true,
        includePrivate: true,
      });
    });
  });

  describe("getExportKey", () => {
    it("should write to the uploads bucket", () => {
      const teamId = randomUUID();
      const key = FileOperation.getExportKey({
        name: "My Collection",
        teamId,
        format: FileOperationFormat.MarkdownZip,
      });

      expect(key).toEqual(
        expect.stringMatching(
          new RegExp(
            `^uploads/${teamId}/[^/]+/My Collection-export\\.markdown\\.zip$`
          )
        )
      );
      expect(ValidateKey.isValid(key)).toBe(true);
    });

    it("should not allow the name to traverse to another bucket", () => {
      const key = FileOperation.getExportKey({
        name: `../../../public/${randomUUID()}/${randomUUID()}/x`,
        teamId: randomUUID(),
        format: FileOperationFormat.MarkdownZip,
      });

      expect(key.split("/")).toHaveLength(4);
      // The key must still point inside the uploads bucket once normalized.
      expect(path.posix.normalize(key).startsWith("uploads/")).toBe(true);
    });
  });

  describe("findByPk", () => {
    it("should not allow a passed where to override the id", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const fileOperation = await buildFileOperation({
        teamId: team.id,
        userId: user.id,
      });
      const other = await buildFileOperation({
        teamId: team.id,
        userId: user.id,
      });

      const found = await FileOperation.findByPk(fileOperation.id, {
        where: { id: other.id },
      });

      expect(found?.id).toEqual(fileOperation.id);
    });

    it("should throw the passed error when rejectOnEmpty is an error", async () => {
      const error = new Error("does not exist");

      await expect(
        FileOperation.findByPk("3a1b2c3d-0000-4000-8000-000000000000", {
          rejectOnEmpty: error,
        })
      ).rejects.toThrow(error);
    });
  });
});
