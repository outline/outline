import { parser } from "@server/editor";
import {
  View,
  Subscription,
  Event,
  Notification,
  Revision,
  Document,
} from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
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
    let document = await buildDocument();
    await Revision.createFromDocument(document);

    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);
    const collaborator = await buildUser({ teamId: document.teamId });
    document.collaboratorIds = [collaborator.id];
    await document.save();

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: collaborator.id,
      modelId: revision.id,
      ip,
    });
    expect(spy).toHaveBeenCalled();
  });

  test("should not send a notification if viewed since update", async () => {
    const spy = jest.spyOn(Notification, "create");
    let document = await buildDocument();
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);
    const collaborator = await buildUser({ teamId: document.teamId });
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
      collectionId: document.collectionId!,
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
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: user.id,
      modelId: revision.id,
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  test("should send a notification for subscriptions, even to collaborator", async () => {
    const spy = jest.spyOn(Notification, "create");
    let document = await buildDocument();
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);
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
      collectionId: document.collectionId!,
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
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);

    await document.update({
      collaboratorIds: [collaborator0.id, collaborator1.id, collaborator2.id],
    });

    const task = new RevisionCreatedNotificationsTask();

    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: collaborator0.id,
      modelId: revision.id,
      ip,
    });

    const events = await Event.findAll({
      where: {
        teamId: document.teamId,
      },
    });

    // Should emit 3 `subscriptions.create` events.
    expect(events.length).toEqual(3);
    expect(
      events.every((event) => event.name === "subscriptions.create")
    ).toEqual(true);

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
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);

    await document.update({
      collaboratorIds: [collaborator0.id, collaborator1.id, collaborator2.id],
    });

    const task = new RevisionCreatedNotificationsTask();

    // Those changes will also emit a `revisions.create` event.
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId!,
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
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);

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
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: collaborator0.id,
      modelId: revision.id,
      ip,
    });

    const events = await Event.findAll({
      where: {
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
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);

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
      collectionId: document.collectionId!,
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
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);
    const collaborator = await buildUser({ teamId: document.teamId });
    const subscriber = await buildUser({ teamId: document.teamId });

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
      collectionId: document.collectionId!,
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
    await Revision.createFromDocument(document);
    document = updateDocumentText(document, "Updated body content");
    const revision = await Revision.createFromDocument(document);
    const collaborator = await buildUser({ teamId: document.teamId });

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
      collectionId: document.collectionId!,
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
    const revision = await Revision.createFromDocument(document);
    const collaborator = await buildUser({ teamId: document.teamId });
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
      collectionId: document.collectionId!,
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
    const revision = await Revision.createFromDocument(document);

    const task = new RevisionCreatedNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: user.id,
      modelId: revision.id,
      ip,
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
