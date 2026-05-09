import {
  MentionType,
  NotificationEventType,
  SubscriptionType,
} from "@shared/types";
import { Notification, Subscription } from "@server/models";
import {
  buildDocument,
  buildCollection,
  buildGroup,
  buildGroupUser,
  buildMention,
  buildProseMirrorDoc,
  buildUser,
} from "@server/test/factories";
import DocumentPublishedNotificationsTask from "./DocumentPublishedNotificationsTask";

const ip = "127.0.0.1";

beforeEach(async () => {
  vi.resetAllMocks();
});

describe("documents.publish", () => {
  test("should not send a notification to author", async () => {
    const spy = vi.spyOn(Notification, "create");
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
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test("should send a notification to other users in team", async () => {
    const spy = vi.spyOn(Notification, "create");
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
      ip,
    });
    expect(spy).toHaveBeenCalled();
  });

  test("should send only one notification in a 12-hour window", async () => {
    const spy = vi.spyOn(Notification, "create");
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
      ip,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("should not send a notification to users without collection access", async () => {
    const spy = vi.spyOn(Notification, "create");
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
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test("should not send a notification for group mentions when disableMentions is true", async () => {
    const spy = vi.spyOn(Notification, "create");
    const actor = await buildUser();
    const group = await buildGroup({
      teamId: actor.teamId,
      disableMentions: true,
    });
    const member = await buildUser({ teamId: actor.teamId });
    await buildGroupUser({ groupId: group.id, userId: member.id });

    member.setNotificationEventType(
      NotificationEventType.GroupMentionedInDocument
    );
    await member.save();

    const document = await buildDocument({
      teamId: actor.teamId,
      userId: actor.id,
      content: buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            buildMention({
              type: MentionType.Group,
              modelId: group.id,
              actorId: actor.id,
              label: group.name,
            }),
          ],
        },
      ]).toJSON(),
    });

    const processor = new DocumentPublishedNotificationsTask();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: actor.id,
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should subscribe a mentioned user to the document", async () => {
    const actor = await buildUser();
    const mentioned = await buildUser({ teamId: actor.teamId });

    const document = await buildDocument({
      teamId: actor.teamId,
      userId: actor.id,
      content: buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [buildMention({ modelId: mentioned.id, actorId: actor.id })],
        },
      ]).toJSON(),
    });

    const processor = new DocumentPublishedNotificationsTask();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: actor.id,
      ip,
    });

    const subscription = await Subscription.findOne({
      where: {
        userId: mentioned.id,
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });
    expect(subscription).not.toBeNull();
  });

  it("should respect a prior unsubscribe when a user is mentioned", async () => {
    const actor = await buildUser();
    const mentioned = await buildUser({ teamId: actor.teamId });

    const document = await buildDocument({
      teamId: actor.teamId,
      userId: actor.id,
      content: buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [buildMention({ modelId: mentioned.id, actorId: actor.id })],
        },
      ]).toJSON(),
    });

    // The mentioned user previously subscribed and then unsubscribed.
    const prior = await Subscription.create({
      userId: mentioned.id,
      documentId: document.id,
      event: SubscriptionType.Document,
    });
    await prior.destroy();

    const processor = new DocumentPublishedNotificationsTask();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: actor.id,
      ip,
    });

    // No active subscription should exist.
    const active = await Subscription.findOne({
      where: {
        userId: mentioned.id,
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });
    expect(active).toBeNull();

    // The original soft-deleted subscription should still be soft-deleted.
    const withDeleted = await Subscription.findOne({
      where: {
        userId: mentioned.id,
        documentId: document.id,
        event: SubscriptionType.Document,
      },
      paranoid: false,
    });
    expect(withDeleted).not.toBeNull();
    expect(withDeleted?.deletedAt).not.toBeNull();
  });

  it("should not subscribe users mentioned via a group", async () => {
    const actor = await buildUser();
    const group = await buildGroup({ teamId: actor.teamId });
    const member = await buildUser({ teamId: actor.teamId });
    await buildGroupUser({ groupId: group.id, userId: member.id });

    const document = await buildDocument({
      teamId: actor.teamId,
      userId: actor.id,
      content: buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            buildMention({
              type: MentionType.Group,
              modelId: group.id,
              actorId: actor.id,
              label: group.name,
            }),
          ],
        },
      ]).toJSON(),
    });

    const processor = new DocumentPublishedNotificationsTask();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: actor.id,
      ip,
    });

    const subscription = await Subscription.findOne({
      where: {
        userId: member.id,
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });
    expect(subscription).toBeNull();
  });
});
