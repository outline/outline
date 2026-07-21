import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import Event from "./Event";
import UserMembership from "./UserMembership";

describe("UserMembership", () => {
  describe("events", () => {
    it("should derive the event teamId from the document when the context has no authenticated user", async () => {
      const document = await buildDocument();
      const user = await buildUser({ teamId: document.teamId });

      await UserMembership.create({
        createdById: user.id,
        userId: user.id,
        documentId: document.id,
      });

      const event = await Event.findOne({
        where: { name: "documents.add_user", documentId: document.id },
      });

      expect(event).not.toBeNull();
      expect(event?.teamId).toEqual(document.teamId);
    });
  });

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
