import { subHours } from "date-fns";
import ShareDocumentUpdatedEmail from "@server/emails/templates/ShareDocumentUpdatedEmail";
import Logger from "@server/logging/Logger";
import { Document, Share, ShareSubscription } from "@server/models";
import type { RevisionEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";

export default class ShareSubscriptionNotificationsTask extends BaseTask<RevisionEvent> {
  public async perform(event: RevisionEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document) {
      return;
    }

    // Collect the document's ID and all ancestor IDs by walking up the tree.
    // A subscription scoped to any of these documents covers the updated one.
    const scopeIds: string[] = [document.id];
    let parentId = document.parentDocumentId;
    while (parentId) {
      scopeIds.push(parentId);
      const parent = await Document.findByPk(parentId, {
        attributes: ["id", "parentDocumentId"],
      });
      if (!parent) {
        break;
      }
      parentId = parent.parentDocumentId;
    }

    // Find all active subscriptions scoped to this document or any ancestor,
    // joined to a published share that allows subscriptions.
    const subscriptions = await ShareSubscription.scope("active").findAll({
      where: { documentId: scopeIds },
      include: [
        {
          model: Share.unscoped(),
          required: true,
          where: {
            published: true,
            revokedAt: null,
            allowSubscriptions: true,
          },
          include: [{ association: "team", required: true }],
        },
      ],
    });

    for (const subscription of subscriptions) {
      // Skip ancestor-scoped subscriptions when the share doesn't include
      // child documents — the updated document wouldn't be accessible.
      if (
        subscription.documentId !== document.id &&
        !subscription.share.includeChildDocuments
      ) {
        continue;
      }

      // Throttle: only one notification per 6 hours
      if (
        subscription.lastNotifiedAt &&
        subscription.lastNotifiedAt > subHours(new Date(), 6)
      ) {
        Logger.info(
          "processor",
          `suppressing share subscription notification to ${subscription.id} as recently notified`
        );
        continue;
      }

      const baseShareUrl = subscription.share.canonicalUrl;
      const shareUrl =
        document.id !== subscription.share.documentId && document.path
          ? `${baseShareUrl.replace(/\/$/, "")}${document.path}`
          : baseShareUrl;

      await new ShareDocumentUpdatedEmail({
        to: subscription.email,
        shareSubscriptionId: subscription.id,
        documentTitle: document.titleWithDefault,
        shareUrl,
        revisionId: event.modelId,
      }).schedule();

      subscription.lastNotifiedAt = new Date();
      await subscription.save();
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
