import { createContext } from "@server/context";
import {
  buildCollection,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";

describe("ParanoidModel", () => {
  describe("deletedById", () => {
    it("should record the acting user on destroy", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });

      await document.destroy(createContext({ user }).context);
      await document.reload({ paranoid: false });

      expect(document.deletedAt).toBeTruthy();
      expect(document.deletedById).toEqual(user.id);
    });

    it("should clear the recorded user on restore", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });

      await document.destroy(createContext({ user }).context);
      await document.restore();
      await document.reload();

      expect(document.deletedAt).toBeNull();
      expect(document.deletedById).toBeNull();
    });

    it("should record nothing when the context is unauthenticated", async () => {
      const document = await buildDocument();

      await document.destroy();
      await document.reload({ paranoid: false });

      expect(document.deletedAt).toBeTruthy();
      expect(document.deletedById).toBeNull();
    });

    it("should ignore models without the column", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      // A team must keep at least one collection, so build a second to delete.
      await buildCollection({ teamId: team.id, userId: user.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });

      await collection.destroy(createContext({ user }).context);

      expect(collection.deletedAt).toBeTruthy();
    });
  });
});
