import { buildCollection, buildUser } from "@server/test/factories";
import UserPermission from "./UserPermission";

describe("UserPermission", () => {
  describe("withCollection scope", () => {
    it("should return the collection", async () => {
      const collection = await buildCollection();
      const user = await buildUser({ teamId: collection.teamId });

      await UserPermission.create({
        createdById: user.id,
        userId: user.id,
        collectionId: collection.id,
      });

      const permission = await UserPermission.scope("withCollection").findOne({
        where: {
          userId: user.id,
          collectionId: collection.id,
        },
      });

      expect(permission).toBeDefined();
      expect(permission?.collection).toBeDefined();
      expect(permission?.collection?.id).toEqual(collection.id);
    });
  });
});
