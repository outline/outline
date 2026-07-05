import { subDays, subHours } from "date-fns";
import { NotificationEventType } from "@shared/types";
import { Notification } from "@server/models";
import type { DocumentEvent } from "@server/types";
import { buildDocument, buildTeam, buildUser } from "@server/test/factories";
import DocumentVerificationExpiredNotificationsTask from "./DocumentVerificationExpiredNotificationsTask";

vi.setConfig({ testTimeout: 30000 });

describe("DocumentVerificationExpiredNotificationsTask", () => {
  let task: DocumentVerificationExpiredNotificationsTask;

  beforeEach(() => {
    task = new DocumentVerificationExpiredNotificationsTask();
  });

  const buildExpiredDocument = async () => {
    const team = await buildTeam();
    const verifier = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: verifier.id,
      verifiedAt: subDays(new Date(), 30),
      verifiedById: verifier.id,
      verificationExpiresAt: subHours(new Date(), 12),
    });
    const event = {
      name: "documents.verification_expired",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: team.id,
      data: {
        expiresAt: document.verificationExpiresAt!.toISOString(),
      },
    } as DocumentEvent;

    return { team, verifier, document, event };
  };

  const countNotifications = (userId: string) =>
    Notification.count({
      where: {
        event: NotificationEventType.VerificationExpired,
        userId,
      },
    });

  it("creates a notification for an active verifier", async () => {
    const { verifier, document, event } = await buildExpiredDocument();

    await task.perform(event);

    expect(await countNotifications(verifier.id)).toBe(1);
    const notification = await Notification.findOne({
      where: {
        event: NotificationEventType.VerificationExpired,
        userId: verifier.id,
      },
    });
    expect(notification?.documentId).toEqual(document.id);
  });

  it("creates no notification when the verifier is suspended", async () => {
    const { verifier, event } = await buildExpiredDocument();
    await verifier.update({ suspendedAt: new Date() });

    await task.perform(event);

    expect(await countNotifications(verifier.id)).toBe(0);
  });

  it("creates no notification when the verifier was deleted", async () => {
    const { team, verifier, document, event } = await buildExpiredDocument();
    await buildUser({ teamId: team.id });
    // deleting a user nulls the verifier reference via the FK
    await document.update({ verifiedById: null });
    await verifier.destroy();

    await task.perform(event);

    expect(await countNotifications(verifier.id)).toBe(0);
  });

  it("creates no notification when the document was re-verified since", async () => {
    const { verifier, document, event } = await buildExpiredDocument();
    await document.update({
      verifiedAt: new Date(),
      verificationExpiresAt: subDays(new Date(), -30),
    });

    await task.perform(event);

    expect(await countNotifications(verifier.id)).toBe(0);
  });

  it("creates no notification when the verifier unsubscribed from the event", async () => {
    const { verifier, event } = await buildExpiredDocument();
    await verifier.update({
      notificationSettings: {
        [NotificationEventType.VerificationExpired]: false,
      },
    });

    await task.perform(event);

    expect(await countNotifications(verifier.id)).toBe(0);
  });
});
