import { sleep } from "@shared/utils/timers";
import { CollectionPermission } from "@shared/types";
import {
  buildCollection,
  buildDocument,
  buildGroup,
  buildUser,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import Event from "./Event";
import GroupMembership from "./GroupMembership";
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
  describe("validateLastAdminPermission", () => {
    it("should not allow the last user and group manager to be removed concurrently", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        userId: user.id,
      });
      const group = await buildGroup({ teamId: user.teamId });

      // The collection creator is its only user manager.
      const userMembership = await UserMembership.findOne({
        where: { collectionId: collection.id, userId: user.id },
        rejectOnEmpty: true,
      });
      const groupMembership = await GroupMembership.create({
        createdById: user.id,
        groupId: group.id,
        collectionId: collection.id,
        permission: CollectionPermission.Admin,
      });

      let removed: () => void = () => undefined;
      const first = new Promise<void>((resolve) => {
        removed = resolve;
      });
      let commit: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        commit = resolve;
      });

      // The user membership goes first, leaving the group as the only manager.
      const one = withAPIContext(user, async (ctx) => {
        await userMembership.destroyWithCtx(ctx);
        removed();
        await held;
      });
      await first;

      const two = withAPIContext(user, (ctx) =>
        groupMembership.destroyWithCtx(ctx)
      );
      await sleep(250);
      commit();
      await one;

      await expect(two).rejects.toThrow(
        "At least one user or group must have manage permissions"
      );
    });
  });
});
