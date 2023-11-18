import { NotificationEventType } from "@shared/types";
import { Notification } from "@server/models";
import {
  buildDocument,
  buildCollection,
  buildUser,
} from "@server/test/factories";
import DocumentPublishedNotificationsTask from "./DocumentPublishedNotificationsTask";

const ip = "127.0.0.1";

beforeEach(async () => {
  jest.resetAllMocks();
});

describe("documents.publish", () => {
  test("should not send a notification to author", async () => {
    const spy = jest.spyOn(Notification, "create");
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      lastModifiedById: user.id,
    });
    user.setNotificationEventType(NotificationEventType.PublishDocument);
    await user.save();

    const processor = new DocumentPublishedNotificationsTask();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      data: {
        title: document.title,
      },
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test("should send a notification to other users in team", async () => {
    const spy = jest.spyOn(Notification, "create");
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
    });
    user.setNotificationEventType(NotificationEventType.PublishDocument);
    await user.save();

    const processor = new DocumentPublishedNotificationsTask();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      data: {
        title: document.title,
      },
      ip,
    });
    expect(spy).toHaveBeenCalled();
  });

  test("should send only one notification in a 12-hour window", async () => {
    const spy = jest.spyOn(Notification, "create");
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      createdById: user.id,
      lastModifiedById: user.id,
    });

    const recipient = await buildUser({
      teamId: user.teamId,
    });

    user.setNotificationEventType(NotificationEventType.PublishDocument);
    await user.save();

    await Notification.create({
      event: NotificationEventType.PublishDocument,
      actorId: user.id,
      userId: recipient.id,
      documentId: document.id,
      teamId: recipient.teamId,
      emailedAt: new Date(),
    });

    const processor = new DocumentPublishedNotificationsTask();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      data: {
        title: document.title,
      },
      ip,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("should not send a notification to users without collection access", async () => {
    const spy = jest.spyOn(Notification, "create");
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
    });
    user.setNotificationEventType(NotificationEventType.PublishDocument);
    await user.save();

    const processor = new DocumentPublishedNotificationsTask();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      data: {
        title: document.title,
      },
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
