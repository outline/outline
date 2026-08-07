import { subHours } from "date-fns";
import { randomString } from "@shared/random";
import documentMover from "@server/commands/documentMover";
import ShareDocumentUpdatedEmail from "@server/emails/templates/ShareDocumentUpdatedEmail";
import { Collection, ShareSubscription } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildDraftDocument,
  buildShare,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import ShareSubscriptionNotificationsTask from "./ShareSubscriptionNotificationsTask";

const ip = "127.0.0.1";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ShareSubscriptionNotificationsTask", () => {
  it("should send email to confirmed subscriber", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should not send email to unconfirmed subscriber", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not send email to unsubscribed subscriber", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
      unsubscribedAt: new Date(),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should throttle notifications to once per 6 hours", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
      lastNotifiedAt: subHours(new Date(), 3),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should send if last notified more than 6 hours ago", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
      lastNotifiedAt: subHours(new Date(), 7),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should not send for unpublished shares", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      published: false,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should update lastNotifiedAt after sending", async () => {
    vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    const subscription = await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    expect(subscription.lastNotifiedAt).toBeNull();

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    await subscription.reload();
    expect(subscription.lastNotifiedAt).not.toBeNull();
  });

  it("should send to multiple subscribers", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });

    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "sub1@example.com",
      emailFingerprint: "sub1@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "sub2@example.com",
      emailFingerprint: "sub2@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("should not send if document has no shares", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");
    const document = await buildDocument();

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should send when child document is updated and subscription is scoped to parent", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const parent = await buildDocument();
    const child = await buildDocument({
      parentDocumentId: parent.id,
      collectionId: parent.collectionId,
      teamId: parent.teamId,
    });
    const share = await buildShare({
      documentId: parent.id,
      teamId: parent.teamId,
      includeChildDocuments: true,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: parent.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: child.id,
      teamId: child.teamId,
      actorId: child.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should not send when updated document is outside subscription scope", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const parent = await buildDocument();
    const sibling = await buildDocument({
      collectionId: parent.collectionId,
      teamId: parent.teamId,
    });
    const share = await buildShare({
      documentId: parent.id,
      teamId: parent.teamId,
      includeChildDocuments: true,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: parent.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: sibling.id,
      teamId: sibling.teamId,
      actorId: sibling.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not send when updated child document is an unpublished draft", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const parent = await buildDocument();
    const draft = await buildDraftDocument({
      parentDocumentId: parent.id,
      collectionId: parent.collectionId,
      teamId: parent.teamId,
      userId: parent.createdById,
    });
    const share = await buildShare({
      documentId: parent.id,
      teamId: parent.teamId,
      includeChildDocuments: true,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: parent.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: draft.id,
      teamId: draft.teamId,
      actorId: draft.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not send when subscribed document has moved out of the shared collection", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: user.id,
    });
    const other = await buildCollection({ teamId: team.id, userId: user.id });
    const document = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
    });
    const share = await buildShare({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
      includeChildDocuments: true,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    await withAPIContext(user, (ctx) =>
      documentMover(ctx, { document, collectionId: other.id })
    );

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not send when sharing is disabled on the collection", async () => {
    const spy = vi.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
      documentId: document.id,
      email: "subscriber@example.com",
      emailFingerprint: "subscriber@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });

    const collection = await Collection.findByPk(document.collectionId!, {
      rejectOnEmpty: true,
    });
    collection.sharing = false;
    await collection.save();

    const task = new ShareSubscriptionNotificationsTask();
    await task.perform({
      name: "revisions.create",
      documentId: document.id,
      teamId: document.teamId,
      actorId: document.createdById,
      modelId: "revision-id",
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
