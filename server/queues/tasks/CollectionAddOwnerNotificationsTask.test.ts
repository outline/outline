import { NotificationEventType } from "@shared/types";
import { Notification } from "@server/models";
import { buildCollection, buildUser } from "@server/test/factories";
import CollectionAddOwnerNotificationsTask from "./CollectionAddOwnerNotificationsTask";

const ip = "127.0.0.1";

describe("CollectionAddOwnerNotificationsTask", () => {
  const perform = (userId: string, collectionId: string, teamId: string) =>
    new CollectionAddOwnerNotificationsTask().perform({
      name: "collections.add_owner",
      userId,
      modelId: collectionId,
      collectionId,
      teamId,
      actorId: userId,
      ip,
    });

  it("should notify a user made an owner of a collection", async () => {
    const owner = await buildUser();
    const collection = await buildCollection({
      teamId: owner.teamId,
      ownerIds: [owner.id],
    });

    await perform(owner.id, collection.id, owner.teamId);

    const notifications = await Notification.findAll({
      where: { userId: owner.id },
    });
    expect(notifications.map((notification) => notification.event)).toEqual([
      NotificationEventType.AddOwnerToCollection,
    ]);
    expect(notifications[0].collectionId).toEqual(collection.id);
  });

  it("should not notify a user that is no longer an owner", async () => {
    const user = await buildUser();
    const collection = await buildCollection({ teamId: user.teamId });

    await perform(user.id, collection.id, user.teamId);

    expect(await Notification.count({ where: { userId: user.id } })).toBe(0);
  });
});
