import type { DeepPartial } from "utility-types";
import type { ProsemirrorData } from "@shared/types";
import { v4 as uuidv4 } from "uuid";
import { MentionType, NotificationEventType } from "@shared/types";
import { createContext } from "@server/context";
import { parser } from "@server/editor";
import type { Document } from "@server/models";
import {
  View,
  Subscription,
  Event,
  Notification,
  Revision,
} from "@server/models";
import {
  buildDocument,
  buildGroup,
  buildGroupUser,
  buildUser,
} from "@server/test/factories";
import RevisionCreatedNotificationsTask from "./RevisionCreatedNotificationsTask";

const ip = "127.0.0.1";

beforeEach(async () => {
  jest.resetAllMocks();
});

function updateDocumentText(document: Document, text: string) {
  document.content = parser.parse(text)?.toJSON();
  document.updatedAt = new Date();
  return document;
}

describe("revisions.create", () => {
  test("should send a notification to other collaborators", async () => {
    const spy = jest.spyOn(Notification, "create");
    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    await Revision.createFromDocument(createContext({ user }), document);

    document = updateDocumentText(document, "Updated body content");
    const collaborator = await buildUser({ teamId: document.teamId });
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );
    document.collaboratorIds = [user.id, collaborator.id];
    await document.save();

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator.id,
      modelId: revision.id,
      ip,
    });
    expect(spy).toHaveBeenCalled();
  });

  test("should not send a notification if viewed since update", async () => {
    const spy = jest.spyOn(Notification, "create");
    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    await Revision.createFromDocument(createContext({ user }), document);

    document = updateDocumentText(document, "Updated body content");
    const collaborator = await buildUser({ teamId: document.teamId });
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );
    document.collaboratorIds = [user.id, collaborator.id];
    await document.save();

    await View.create({
      userId: collaborator.id,
      documentId: document.id,
    });

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator.id,
      modelId: revision.id,
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test("should not send a notification to last editor", async () => {
    const spy = jest.spyOn(Notification, "create");
    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
      lastModifiedById: user.id,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: user.id,
      modelId: revision.id,
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test("should send a notification for subscriptions, even to collaborator", async () => {
    const spy = jest.spyOn(Notification, "create");
    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    const collaborator = await buildUser({ teamId: document.teamId });
    const subscriber = await buildUser({ teamId: document.teamId });

    document.collaboratorIds = [collaborator.id, subscriber.id];

    await document.save();

    await Subscription.create({
      userId: subscriber.id,
      documentId: document.id,
      event: "documents.update",
    });

    const task = new RevisionCreatedNotificationsTask();

    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator.id,
      modelId: revision.id,
      ip,
    });

    expect(spy).toHaveBeenCalled();
  });

  test("should create subscriptions for collaborator", async () => {
    const collaborator0 = await buildUser();
    const collaborator1 = await buildUser({ teamId: collaborator0.teamId });
    const collaborator2 = await buildUser({ teamId: collaborator0.teamId });
    let document = await buildDocument({
      teamId: collaborator0.teamId,
      userId: collaborator0.id,
    });
    await Revision.createFromDocument(
      createContext({ user: collaborator0 }),
      document
    );
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator0 }),
      document
    );

    await document.update({
      collaboratorIds: [collaborator0.id, collaborator1.id, collaborator2.id],
    });

    const task = new RevisionCreatedNotificationsTask();

    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator0.id,
      modelId: revision.id,
      ip,
    });

    const events = await Event.findAll({
      where: {
        name: "subscriptions.create",
        teamId: document.teamId,
      },
    });

    // Should emit 3 `subscriptions.create` events.
    expect(events.length).toEqual(3);

    // Each event should point to same document.
    expect(events.every((event) => event.documentId === document.id)).toEqual(
      true
    );

    // Events should mention correct `userId`.
    const userIds = events.map((event) => event.userId);
    expect(userIds).toEqual(
      expect.arrayContaining([
        collaborator0.id,
        collaborator1.id,
        collaborator2.id,
      ])
    );
    expect(userIds.length).toBe(3);
  });

  test("should not send multiple emails", async () => {
    const spy = jest.spyOn(Notification, "create");
    const collaborator0 = await buildUser();
    const collaborator1 = await buildUser({ teamId: collaborator0.teamId });
    const collaborator2 = await buildUser({ teamId: collaborator0.teamId });
    let document = await buildDocument({
      teamId: collaborator0.teamId,
      userId: collaborator0.id,
    });
    await Revision.createFromDocument(
      createContext({ user: collaborator0 }),
      document
    );
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator0 }),
      document
    );

    await document.update({
      collaboratorIds: [collaborator0.id, collaborator1.id, collaborator2.id],
    });

    const task = new RevisionCreatedNotificationsTask();

    // Those changes will also emit a `revisions.create` event.
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator0.id,
      modelId: revision.id,
      ip,
    });

    // This should send out 2 emails, one for each collaborator that did not
    // participate in the edit
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test("should not create subscriptions if previously unsubscribed", async () => {
    const spy = jest.spyOn(Notification, "create");
    const collaborator0 = await buildUser();
    const collaborator1 = await buildUser({ teamId: collaborator0.teamId });
    const collaborator2 = await buildUser({ teamId: collaborator0.teamId });
    let document = await buildDocument({
      teamId: collaborator0.teamId,
      userId: collaborator0.id,
    });
    await Revision.createFromDocument(
      createContext({ user: collaborator0 }),
      document
    );
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator0 }),
      document
    );

    await document.update({
      collaboratorIds: [collaborator0.id, collaborator1.id, collaborator2.id],
    });

    // `collaborator2` created a subscription.
    const subscription2 = await Subscription.create({
      userId: collaborator2.id,
      documentId: document.id,
      event: "documents.update",
    });

    // `collaborator2` would no longer like to be notified.
    await subscription2.destroy();

    const task = new RevisionCreatedNotificationsTask();

    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator0.id,
      modelId: revision.id,
      ip,
    });

    const events = await Event.findAll({
      where: {
        name: "subscriptions.create",
        teamId: document.teamId,
      },
    });

    // Should emit 2 `subscriptions.create` events.
    expect(events.length).toEqual(2);
    expect(events.every((event) => event.documentId === document.id)).toEqual(
      true
    );
    expect(events.some((event) => event.userId === collaborator0.id)).toEqual(
      true
    );
    expect(events.some((event) => event.userId === collaborator1.id)).toEqual(
      true
    );

    // One notification as one collaborator performed edit and the other is
    // unsubscribed
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("should send a notification for subscriptions to non-collaborators", async () => {
    const spy = jest.spyOn(Notification, "create");
    let document = await buildDocument();
    const collaborator = await buildUser({ teamId: document.teamId });
    const subscriber = await buildUser({ teamId: document.teamId });
    await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );

    // `subscriber` hasn't collaborated on `document`.
    document.collaboratorIds = [collaborator.id];

    await document.save();

    // `subscriber` subscribes to `document`'s changes.
    // Specifically "documents.update" event.
    await Subscription.create({
      userId: subscriber.id,
      documentId: document.id,
      event: "documents.update",
    });

    const task = new RevisionCreatedNotificationsTask();

    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator.id,
      modelId: revision.id,
      ip,
    });

    expect(spy).toHaveBeenCalled();
  });

  test("should not send a notification for subscriptions to collaborators if unsubscribed", async () => {
    const spy = jest.spyOn(Notification, "create");

    let document = await buildDocument();
    const collaborator = await buildUser({ teamId: document.teamId });
    const subscriber = await buildUser({ teamId: document.teamId });
    await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );

    // `subscriber` has collaborated on `document`.
    document.collaboratorIds = [collaborator.id, subscriber.id];

    await document.save();

    // `subscriber` subscribes to `document`'s changes.
    // Specifically "documents.update" event.
    const subscription = await Subscription.create({
      userId: subscriber.id,
      documentId: document.id,
      event: "documents.update",
    });

    await subscription.destroy();

    const task = new RevisionCreatedNotificationsTask();

    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator.id,
      modelId: revision.id,
      ip,
    });

    // Should send notification to `collaborator` and not `subscriber`.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("should not send a notification for subscriptions to members outside of the team", async () => {
    const spy = jest.spyOn(Notification, "create");

    let document = await buildDocument();
    const collaborator = await buildUser({ teamId: document.teamId });
    await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );

    // `subscriber` *does not* belong
    // to `collaborator`'s team,
    const subscriber = await buildUser();

    // `subscriber` hasn't collaborated on `document`.
    document.collaboratorIds = [collaborator.id];

    await document.save();

    // `subscriber` subscribes to `document`'s changes.
    // Specifically "documents.update" event.
    // Not sure how they got hold of this document,
    // but let's just pretend they did!
    await Subscription.create({
      userId: subscriber.id,
      documentId: document.id,
      event: "documents.update",
    });

    const task = new RevisionCreatedNotificationsTask();

    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator.id,
      modelId: revision.id,
      ip,
    });

    // Should send notification to `collaborator` and not `subscriber`.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("should not send a notification if viewed since update", async () => {
    const spy = jest.spyOn(Notification, "create");

    const document = await buildDocument();
    const collaborator = await buildUser({ teamId: document.teamId });
    const revision = await Revision.createFromDocument(
      createContext({ user: collaborator }),
      document
    );
    document.collaboratorIds = [collaborator.id];
    await document.save();

    await View.create({
      userId: collaborator.id,
      documentId: document.id,
    });

    const task = new RevisionCreatedNotificationsTask();

    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: collaborator.id,
      modelId: revision.id,
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test("should not send a notification to last editor", async () => {
    const spy = jest.spyOn(Notification, "create");

    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      lastModifiedById: user.id,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: user.id,
      modelId: revision.id,
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test("should send a mention notification even when change is below threshold", async () => {
    const spy = jest.spyOn(Notification, "create");
    const actor = await buildUser();
    const mentioned = await buildUser({ teamId: actor.teamId, name: "Kim" });

    // Build a document with some initial content
    let document = await buildDocument({
      teamId: actor.teamId,
      userId: actor.id,
    });
    await Revision.createFromDocument(createContext({ user: actor }), document);

    // Now add a mention – the only change is the mention node itself, which
    // renders as "@<label>" in plain text and may be below the 5-char
    // threshold that gates generic update notifications.
    const mentionContent: DeepPartial<ProsemirrorData> = {
      type: "doc",
      content: [
        ...(document.content?.content ?? []),
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: {
                type: MentionType.User,
                label: mentioned.name,
                modelId: mentioned.id,
                actorId: actor.id,
                id: "test-mention-id",
              },
            },
          ],
        },
      ],
    };
    document.content = mentionContent as ProsemirrorData;
    document.updatedAt = new Date();
    await document.save();

    const revision = await Revision.createFromDocument(
      createContext({ user: actor }),
      document
    );

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: actor.id,
      modelId: revision.id,
      ip,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NotificationEventType.MentionedInDocument,
        userId: mentioned.id,
        actorId: actor.id,
        documentId: document.id,
      })
    );
  });

  test("should not send a notification for group mentions when disableMentions is true", async () => {
    const spy = jest.spyOn(Notification, "create");
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

    let document = await buildDocument({
      teamId: actor.teamId,
      userId: actor.id,
    });
    await Revision.createFromDocument(createContext({ user: actor }), document);

    // Update document to include a group mention
    document.content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Updated content with a group mention ",
            },
            {
              type: "mention",
              attrs: {
                id: uuidv4(),
                type: MentionType.Group,
                label: group.name,
                modelId: group.id,
                actorId: actor.id,
              },
            },
          ],
        },
      ],
    };
    document.updatedAt = new Date();
    await document.save();

    const revision = await Revision.createFromDocument(
      createContext({ user: actor }),
      document
    );

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: actor.id,
      modelId: revision.id,
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
