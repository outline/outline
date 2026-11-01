import UserAuthentication from "@server/models/UserAuthentication";
import { Collection, Document } from "@server/models";
import {
  buildAdmin,
  buildDocument,
  buildPersonalCollection,
  buildUser,
  buildWebhookSubscription,
} from "@server/test/factories";
import { serialize } from "@server/policies";
import UserDeletedProcessor from "./UserDeletedProcessor";

const ip = "127.0.0.1";

describe("UserDeletedProcessor", () => {
  it("should remove relationships", async () => {
    const user = await buildUser();
    expect(
      await UserAuthentication.count({
        where: {
          userId: user.id,
        },
      })
    ).toBe(1);

    const processor = new UserDeletedProcessor();
    await processor.perform({
      name: "users.delete",
      userId: user.id,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    });

    expect(
      await UserAuthentication.count({
        where: {
          userId: user.id,
        },
      })
    ).toBe(0);
  });

  it("should disable webhook subscriptions created by the user", async () => {
    const user = await buildUser();
    const webhook = await buildWebhookSubscription({
      teamId: user.teamId,
      createdById: user.id,
    });

    const processor = new UserDeletedProcessor();
    await processor.perform({
      name: "users.delete",
      userId: user.id,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    });

    await webhook.reload();
    expect(webhook.enabled).toEqual(false);
  });

  it("should turn the personal collection into a private collection", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const personal = await buildPersonalCollection(user);

    const processor = new UserDeletedProcessor();
    await processor.perform({
      name: "users.delete",
      userId: user.id,
      actorId: admin.id,
      teamId: user.teamId,
      ip,
    });

    const collection = await Collection.findByPk(personal.id, {
      userId: admin.id,
      rejectOnEmpty: true,
    });
    expect(collection.ownerId).toBeNull();
    expect(collection.permission).toBeNull();
    expect(collection.memberships).toHaveLength(0);

    const abilities = serialize(admin, collection);
    expect(abilities.read).toBeTruthy();
    expect(abilities.manageUsers).toBeTruthy();
  });

  it("should remove the user from document owners", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      teamId: user.teamId,
      ownerIds: [user.id, other.id],
    });
    const deleted = await buildDocument({
      teamId: user.teamId,
      ownerIds: [user.id],
      deletedAt: new Date(),
    });

    const processor = new UserDeletedProcessor();
    await processor.perform({
      name: "users.delete",
      userId: user.id,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    });

    await document.reload();
    expect(document.ownerIds).toEqual([other.id]);

    const reloaded = await Document.unscoped().findByPk(deleted.id, {
      paranoid: false,
      rejectOnEmpty: true,
    });
    expect(reloaded.ownerIds).toEqual([]);
  });
});
