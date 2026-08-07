import { subHours } from "date-fns";
import { groupBy } from "es-toolkit/compat";
import { loadPublicShare } from "@server/commands/shareLoader";
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

    // Group by share so reachability is resolved once per share rather than
    // once per subscriber.
    for (const grouped of Object.values(groupBy(subscriptions, "shareId"))) {
      const share = grouped[0].share;

      // Only notify when the share would actually serve the updated document to
      // an anonymous visitor — the document may have since become a draft,
      // moved out of the shared tree, or had sharing disabled around it.
      if (!(await this.isServedByShare(share, document))) {
        continue;
      }

      const baseShareUrl = share.canonicalUrl;
      const shareUrl =
        document.id !== share.documentId && document.path
          ? `${baseShareUrl.replace(/\/$/, "")}${document.path}`
          : baseShareUrl;

      for (const subscription of grouped) {
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
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }

  /**
   * Whether the given share publicly serves the given document, using the same
   * loader that backs the public share endpoints.
   *
   * @param share the published share to check.
   * @param document the document to check reachability of.
   * @returns true if an anonymous visitor could read the document.
   */
  private async isServedByShare(
    share: Share,
    document: Document
  ): Promise<boolean> {
    try {
      await loadPublicShare({
        id: share.id,
        documentId: document.id,
        teamId: share.teamId,
      });
      return true;
    } catch (_err) {
      return false;
    }
  }
}
