import { buildCollection, buildGroup, buildUser } from "@server/test/factories";
import GroupPermission from "./GroupPermission";

describe("GroupPermission", () => {
  describe("withCollection scope", () => {
    it("should return the collection", async () => {
      const collection = await buildCollection();
      const group = await buildGroup();
      const user = await buildUser({ teamId: group.teamId });

      await GroupPermission.create({
        createdById: user.id,
        groupId: group.id,
        collectionId: collection.id,
      });

      const permission = await GroupPermission.scope("withCollection").findOne({
        where: {
          groupId: group.id,
          collectionId: collection.id,
        },
      });

      expect(permission).toBeDefined();
      expect(permission?.collection).toBeDefined();
      expect(permission?.collection?.id).toEqual(collection.id);
    });
  });
});
