import { NotificationEventType } from "@shared/types";
import { Event } from "@server/models";
import {
  buildUser,
  buildNotification,
  buildDocument,
  buildCollection,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import notificationUpdater from "./notificationUpdater";

describe("notificationUpdater", () => {
  it("should mark the notification as viewed", async () => {
    const user = await buildUser();
    const actor = await buildUser({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      teamId: user.teamId,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
      createdById: actor.id,
    });
    const notification = await buildNotification({
      actorId: actor.id,
      event: NotificationEventType.UpdateDocument,
      userId: user.id,
      teamId: user.teamId,
      documentId: document.id,
      collectionId: collection.id,
    });

    expect(notification.archivedAt).toBe(null);
    expect(notification.viewedAt).toBe(null);

    await withAPIContext(user, (ctx) =>
      notificationUpdater(ctx, {
        notification,
        viewedAt: new Date(),
      })
    );
    const event = await Event.findLatest({
      teamId: user.teamId,
    });

    expect(notification.viewedAt).not.toBe(null);
    expect(notification.archivedAt).toBe(null);
    expect(event!.name).toEqual("notifications.update");
    expect(event!.modelId).toEqual(notification.id);
  });

  it("should mark the notification as unseen", async () => {
    const user = await buildUser();
    const actor = await buildUser({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      teamId: user.teamId,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
      createdById: actor.id,
    });
    const notification = await buildNotification({
      actorId: actor.id,
      event: NotificationEventType.UpdateDocument,
      userId: user.id,
      teamId: user.teamId,
      documentId: document.id,
      collectionId: collection.id,
      viewedAt: new Date(),
    });

    expect(notification.archivedAt).toBe(null);
    expect(notification.viewedAt).not.toBe(null);

    await withAPIContext(user, (ctx) =>
      notificationUpdater(ctx, {
        notification,
        viewedAt: null,
      })
    );
    const event = await Event.findLatest({
      teamId: user.teamId,
    });

    expect(notification.viewedAt).toBe(null);
    expect(notification.archivedAt).toBe(null);
    expect(event!.name).toEqual("notifications.update");
    expect(event!.modelId).toEqual(notification.id);
  });

  it("should archive the notification", async () => {
    const user = await buildUser();
    const actor = await buildUser({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      teamId: user.teamId,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
      createdById: actor.id,
    });
    const notification = await buildNotification({
      actorId: actor.id,
      event: NotificationEventType.UpdateDocument,
      userId: user.id,
      teamId: user.teamId,
      documentId: document.id,
      collectionId: collection.id,
    });

    expect(notification.archivedAt).toBe(null);
    expect(notification.viewedAt).toBe(null);

    await withAPIContext(user, (ctx) =>
      notificationUpdater(ctx, {
        notification,
        archivedAt: new Date(),
      })
    );
    const event = await Event.findLatest({
      teamId: user.teamId,
    });

    expect(notification.viewedAt).toBe(null);
    expect(notification.archivedAt).not.toBe(null);
    expect(event!.name).toEqual("notifications.update");
    expect(event!.modelId).toEqual(notification.id);
  });

  it("should unarchive the notification", async () => {
    const user = await buildUser();
    const actor = await buildUser({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      teamId: user.teamId,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
      createdById: actor.id,
    });
    const notification = await buildNotification({
      actorId: actor.id,
      event: NotificationEventType.UpdateDocument,
      userId: user.id,
      teamId: user.teamId,
      documentId: document.id,
      collectionId: collection.id,
      archivedAt: new Date(),
    });

    expect(notification.archivedAt).not.toBe(null);
    expect(notification.viewedAt).toBe(null);

    await withAPIContext(user, (ctx) =>
      notificationUpdater(ctx, {
        notification,
        archivedAt: null,
      })
    );
    const event = await Event.findLatest({
      teamId: user.teamId,
    });

    expect(notification.viewedAt).toBe(null);
    expect(notification.archivedAt).toBeNull();
    expect(event!.name).toEqual("notifications.update");
    expect(event!.modelId).toEqual(notification.id);
  });
});
