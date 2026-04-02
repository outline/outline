import { subHours } from "date-fns";
import { Op } from "sequelize";
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

    // Find all published, non-revoked shares for this document
    const shares = await Share.findAll({
      where: {
        published: true,
        revokedAt: null,
        [Op.or]: [
          { documentId: document.id },
          ...(document.collectionId
            ? [
                {
                  collectionId: document.collectionId,
                  includeChildDocuments: true,
                },
              ]
            : []),
        ],
      },
    });

    if (!shares.length) {
      return;
    }

    for (const share of shares) {
      if (!share.allowSubscriptions) {
        continue;
      }

      const subscriptions = await ShareSubscription.scope("active").findAll({
        where: { shareId: share.id },
      });

      for (const subscription of subscriptions) {
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

        const baseShareUrl = share.canonicalUrl;
        const shareUrl =
          share.collectionId && document.path
            ? `${baseShareUrl.replace(/\/$/, "")}${document.path}`
            : baseShareUrl;

        new ShareDocumentUpdatedEmail({
          to: subscription.email,
          shareSubscriptionId: subscription.id,
          documentTitle: document.titleWithDefault,
          shareUrl,
        }).schedule();

        subscription.lastNotifiedAt = new Date();
        await subscription.save();
      }
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
