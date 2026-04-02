import { subHours } from "date-fns";
import { randomString } from "@shared/random";
import ShareDocumentUpdatedEmail from "@server/emails/templates/ShareDocumentUpdatedEmail";
import { ShareSubscription } from "@server/models";
import { buildDocument, buildShare } from "@server/test/factories";
import ShareSubscriptionNotificationsTask from "./ShareSubscriptionNotificationsTask";

const ip = "127.0.0.1";

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("ShareSubscriptionNotificationsTask", () => {
  it("should send email to confirmed subscriber", async () => {
    const spy = jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
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
    const spy = jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
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
    const spy = jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
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
    const spy = jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
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
    const spy = jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await ShareSubscription.create({
      shareId: share.id,
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
    const spy = jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      published: false,
    });
    await ShareSubscription.create({
      shareId: share.id,
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
    jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    const subscription = await ShareSubscription.create({
      shareId: share.id,
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
    const spy = jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");

    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });

    await ShareSubscription.create({
      shareId: share.id,
      email: "sub1@example.com",
      emailFingerprint: "sub1@example.com",
      secret: randomString(32),
      confirmedAt: new Date(),
    });
    await ShareSubscription.create({
      shareId: share.id,
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
    const spy = jest.spyOn(ShareDocumentUpdatedEmail.prototype, "schedule");
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
});
