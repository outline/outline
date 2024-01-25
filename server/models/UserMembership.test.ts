import { buildCollection, buildUser } from "@server/test/factories";
import UserMembership from "./UserMembership";

describe("UserMembership", () => {
  describe("withCollection scope", () => {
    it("should return the collection", async () => {
      const collection = await buildCollection();
      const user = await buildUser({ teamId: collection.teamId });

      await UserMembership.create({
        createdById: user.id,
        userId: user.id,
        collectionId: collection.id,
      });

      const membership = await UserMembership.scope("withCollection").findOne({
        where: {
          userId: user.id,
          collectionId: collection.id,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.collection).toBeDefined();
      expect(membership?.collection?.id).toEqual(collection.id);
    });
  });
});
