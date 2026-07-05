import { NotificationEventType } from "@shared/types";
import { Document, Notification, User } from "@server/models";
import type { DocumentEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";

/**
 * Notifies the verifier of a document that their verification has expired.
 * The verifier is the only candidate recipient – when they have been removed,
 * suspended, or have lost access to the document no notification is sent at
 * all, the audit event alone records the expiry.
 */
export default class DocumentVerificationExpiredNotificationsTask extends BaseTask<DocumentEvent> {
  public async perform(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document || !document.verifiedAt || !document.verifiedById) {
      return;
    }

    // ignore stale events – the document was re-verified with a new deadline
    // after this event was emitted.
    if (
      event.name === "documents.verification_expired" &&
      document.verificationExpiresAt?.toISOString() !== event.data.expiresAt
    ) {
      return;
    }

    const recipient = await User.findByPk(document.verifiedById);
    if (
      !recipient ||
      recipient.isSuspended ||
      !recipient.subscribedToEventType(
        NotificationEventType.VerificationExpired
      ) ||
      !(await canUserAccessDocument(recipient, document.id))
    ) {
      return;
    }

    await Notification.create({
      event: NotificationEventType.VerificationExpired,
      userId: recipient.id,
      teamId: document.teamId,
      documentId: document.id,
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
