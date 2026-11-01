import { NotificationEventType } from "@shared/types";
import { Notification } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import DocumentAddOwnerNotificationsTask from "./DocumentAddOwnerNotificationsTask";

const ip = "127.0.0.1";

describe("DocumentAddOwnerNotificationsTask", () => {
  it("should notify a user made an owner of a document", async () => {
    const actor = await buildUser();
    const owner = await buildUser({ teamId: actor.teamId });
    const document = await buildDocument({
      userId: actor.id,
      teamId: actor.teamId,
      ownerIds: [owner.id],
    });

    await new DocumentAddOwnerNotificationsTask().perform({
      name: "documents.add_owner",
      userId: owner.id,
      modelId: document.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    const notifications = await Notification.findAll({
      where: { userId: owner.id },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].event).toEqual(
      NotificationEventType.AddOwnerToDocument
    );
    expect(notifications[0].documentId).toEqual(document.id);
    expect(notifications[0].actorId).toEqual(actor.id);
  });

  it("should not notify a user that is no longer an owner", async () => {
    const actor = await buildUser();
    const owner = await buildUser({ teamId: actor.teamId });
    const document = await buildDocument({
      userId: actor.id,
      teamId: actor.teamId,
    });

    await new DocumentAddOwnerNotificationsTask().perform({
      name: "documents.add_owner",
      userId: owner.id,
      modelId: document.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    expect(await Notification.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("should not notify an owner that cannot access the document", async () => {
    const actor = await buildUser();
    const owner = await buildUser({ teamId: actor.teamId });
    const collection = await buildCollection({
      teamId: actor.teamId,
      userId: actor.id,
      permission: null,
    });
    const document = await buildDocument({
      userId: actor.id,
      teamId: actor.teamId,
      collectionId: collection.id,
      ownerIds: [owner.id],
    });

    await new DocumentAddOwnerNotificationsTask().perform({
      name: "documents.add_owner",
      userId: owner.id,
      modelId: document.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    expect(await Notification.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("should not notify an owner that has unsubscribed", async () => {
    const actor = await buildUser();
    const owner = await buildUser({ teamId: actor.teamId });
    owner.setNotificationEventType(
      NotificationEventType.AddOwnerToDocument,
      false
    );
    await owner.save();
    const document = await buildDocument({
      userId: actor.id,
      teamId: actor.teamId,
      ownerIds: [owner.id],
    });

    await new DocumentAddOwnerNotificationsTask().perform({
      name: "documents.add_owner",
      userId: owner.id,
      modelId: document.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    expect(await Notification.count({ where: { userId: owner.id } })).toBe(0);
  });
});
