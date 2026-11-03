import UserAuthentication from "@server/models/UserAuthentication";
import { Collection } from "@server/models";
import {
  buildAdmin,
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
});
