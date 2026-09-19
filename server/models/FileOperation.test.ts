import { randomUUID } from "node:crypto";
import path from "node:path";
import { FileOperationFormat } from "@shared/types";
import {
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { ValidateKey } from "@server/validation";
import FileOperation from "./FileOperation";

describe("FileOperation", () => {
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
