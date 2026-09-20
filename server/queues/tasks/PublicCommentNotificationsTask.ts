import { Op } from "sequelize";
import ShareCommentCreatedEmail from "@server/emails/templates/ShareCommentCreatedEmail";
import { Comment, Document, Share, ShareSubscription } from "@server/models";
import type { CommentEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";

export default class PublicCommentNotificationsTask extends BaseTask<CommentEvent> {
  public async perform(event: CommentEvent) {
    const comment = await Comment.findByPk(event.modelId);
    if (!comment || !comment.isPublic) {
      return;
    }

    const document = await Document.findByPk(comment.documentId);
    if (!document) {
      return;
    }

    // The thread is the root comment and all of its direct replies — every
    // guest who has taken part in it, at any point, is eligible to be
    // notified about this new comment.
    const rootId = comment.parentCommentId ?? comment.id;
    const threadComments = await Comment.findAll({
      attributes: ["id", "guestEmail"],
      where: {
        [Op.or]: [{ id: rootId }, { parentCommentId: rootId }],
      },
    });

    // Never notify the address that just left this very comment.
    const excludeFingerprint = comment.guestEmail
      ? ShareSubscription.normalizeEmailFingerprint(comment.guestEmail)
      : null;

    const fingerprints = [
      ...new Set(
        threadComments
          .map((threadComment) => threadComment.guestEmail)
          .filter((email): email is string => !!email)
          .map((email) => ShareSubscription.normalizeEmailFingerprint(email))
      ),
    ].filter((fingerprint) => fingerprint !== excludeFingerprint);

    if (!fingerprints.length) {
      return;
    }

    const subscriptions = await ShareSubscription.scope("active").findAll({
      where: {
        documentId: comment.documentId,
        emailFingerprint: { [Op.in]: fingerprints },
      },
      include: [
        {
          model: Share.unscoped(),
          required: true,
          where: {
            published: true,
            revokedAt: null,
            allowPublicComments: true,
          },
          include: [{ association: "team", required: true }],
        },
      ],
    });

    for (const subscription of subscriptions) {
      const baseShareUrl = subscription.share.canonicalUrl;
      const shareUrl =
        document.id !== subscription.share.documentId && document.path
          ? `${baseShareUrl.replace(/\/$/, "")}${document.path}`
          : baseShareUrl;

      await new ShareCommentCreatedEmail({
        to: subscription.email,
        shareSubscriptionId: subscription.id,
        documentTitle: document.titleWithDefault,
        shareUrl,
        commentId: comment.id,
      }).schedule();
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
