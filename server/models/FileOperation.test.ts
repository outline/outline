import {
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import FileOperation from "./FileOperation";

describe("FileOperation", () => {
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
