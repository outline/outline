import { CollectionPermission, NotificationEventType } from "@shared/types";
import { Notification, UserMembership } from "@server/models";
import { buildCollection, buildUser } from "@server/test/factories";
import CollectionAddUserNotificationsTask from "./CollectionAddUserNotificationsTask";

const ip = "127.0.0.1";

describe("CollectionAddUserNotificationsTask", () => {
  const perform = async (ownerIds: (userId: string) => string[]) => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    const collection = await buildCollection({
      teamId: actor.teamId,
      userId: actor.id,
      ownerIds: ownerIds(user.id),
    });
    const membership = await UserMembership.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: actor.id,
      permission: CollectionPermission.Admin,
    });

    await new CollectionAddUserNotificationsTask().perform({
      name: "collections.add_user",
      userId: user.id,
      modelId: membership.id,
      collectionId: collection.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    return Notification.count({
      where: {
        userId: user.id,
        event: NotificationEventType.AddUserToCollection,
      },
    });
  };

  it("should notify a user added to a collection", async () => {
    expect(await perform(() => [])).toBe(1);
  });

  it("should not notify a user that is an owner of the collection", async () => {
    expect(await perform((userId) => [userId])).toBe(0);
  });
});
