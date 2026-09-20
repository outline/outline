import type { Transaction } from "sequelize";
import { randomString } from "@shared/random";
import { TeamPreference } from "@shared/types";
import ShareSubscriptionConfirmEmail from "@server/emails/templates/ShareSubscriptionConfirmEmail";
import type { Share } from "@server/models";
import { Document, ShareSubscription } from "@server/models";
import ShareSubscriptionHelper from "@server/models/helpers/ShareSubscriptionHelper";

type Props = {
  /** The published share the subscription is scoped to. */
  share: Share;
  /** The document to scope notifications to (the document and its descendants). */
  documentId: string;
  /** The email address to subscribe. */
  email: string;
  /** The IP address the subscription request originated from, if known. */
  ip?: string | null;
  /** What the subscription is for, used to word the confirmation email. */
  reason?: "updates" | "comments";
  /** The transaction to perform the write within. */
  transaction: Transaction;
};

/**
 * Creates or reuses a `ShareSubscription` for the given share, document and
 * email, sending a confirmation email with the same semantics as the
 * `shares.subscribe` endpoint: a new address gets a fresh subscription and a
 * confirmation email; a previously unsubscribed address is re-subscribed and
 * re-confirmed; an unconfirmed, recently-emailed address is left alone to
 * avoid spamming it.
 *
 * This is shared between the explicit subscribe endpoint and guest
 * commenters who opt in to notifications when leaving a public comment, so
 * the two flows cannot drift apart. Callers are responsible for gating on
 * whatever precondition applies to them (e.g. `share.allowSubscriptions` or
 * `share.allowPublicComments`) and on `env.EMAIL_ENABLED`.
 *
 * @param props The share, document, email, IP and transaction to use.
 * @returns The created or reused subscription, or null if an existing
 *   subscription needed no action (already confirmed, or too recently sent
 *   a confirmation email to resend one yet).
 */
export default async function shareSubscriptionCreator({
  share,
  documentId,
  email,
  ip = null,
  reason = "updates",
  transaction,
}: Props): Promise<ShareSubscription | null> {
  const emailFingerprint = ShareSubscription.normalizeEmailFingerprint(email);

  const existing = await ShareSubscription.findOne({
    where: { shareId: share.id, documentId, emailFingerprint },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  let subscription: ShareSubscription;

  if (existing) {
    // Already confirmed and active — nothing to do.
    if (existing.isConfirmed && !existing.isUnsubscribed) {
      return null;
    }

    if (existing.isUnsubscribed) {
      // Unsubscribed — allow re-subscribe with a new confirmation.
      existing.unsubscribedAt = null;
      existing.confirmedAt = null;
      existing.lastNotifiedAt = null;
      existing.secret = randomString(32);
      existing.email = email;
      await existing.save({ transaction });
    } else if (!existing.canResendConfirmation) {
      // Confirmation was sent recently, not yet confirmed — don't spam.
      return null;
    } else {
      // Expired or stale unconfirmed — regenerate.
      existing.secret = randomString(32);
      existing.email = email;
      await existing.save({ transaction });
    }

    subscription = existing;
  } else {
    subscription = await ShareSubscription.create(
      {
        shareId: share.id,
        documentId,
        email,
        emailFingerprint,
        secret: randomString(32),
        ipAddress: ip,
      },
      { transaction }
    );
  }

  const document = await Document.findByPk(documentId, { transaction });
  const confirmUrl = ShareSubscriptionHelper.confirmUrl(subscription);
  const usePublicBranding =
    share.team?.getPreference(TeamPreference.PublicBranding) ?? false;

  await new ShareSubscriptionConfirmEmail({
    to: email,
    documentTitle: document?.titleWithDefault ?? "",
    confirmUrl,
    teamName: usePublicBranding ? share.team?.name : undefined,
    reason,
  }).schedule();

  return subscription;
}
