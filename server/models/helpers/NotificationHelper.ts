import uniq from "lodash/uniq";
import { Op } from "sequelize";
import {
  NotificationEventType,
  MentionType,
  SubscriptionType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import {
  User,
  Document,
  Collection,
  Subscription,
  Comment,
  View,
} from "@server/models";
import { can } from "@server/policies";
import { ProsemirrorHelper } from "./ProsemirrorHelper";

export default class NotificationHelper {
  /**
   * Get the recipients of a notification for a collection event.
   *
   * @param collection The collection to get recipients for
   * @param eventType The event type
   * @returns A list of recipients
   */
  public static getCollectionNotificationRecipients = async (
    collection: Collection,
    eventType: NotificationEventType
  ): Promise<User[]> => {
    // Find all the users that have notifications enabled for this event
    // type at all and aren't the one that performed the action.
    let recipients = await User.findAll({
      where: {
        id: {
          [Op.ne]: collection.createdById,
        },
        teamId: collection.teamId,
      },
    });

    recipients = recipients.filter((recipient) =>
      recipient.subscribedToEventType(eventType)
    );

    return recipients;
  };

  /**
   * Get the recipients of a notification for a comment event.
   *
   * @param document The document associated with the comment
   * @param comment The comment to get recipients for
   * @param actorId The creator of the comment
   * @returns A list of recipients
   */
  public static getCommentNotificationRecipients = async (
    document: Document,
    comment: Comment,
    actorId: string
  ): Promise<User[]> => {
    let recipients = await this.getDocumentNotificationRecipients({
      document,
      notificationType: NotificationEventType.CreateComment,
      onlySubscribers: !comment.parentCommentId,
      actorId,
    });

    recipients = recipients.filter((recipient) =>
      recipient.subscribedToEventType(NotificationEventType.CreateComment)
    );

    if (recipients.length > 0 && comment.parentCommentId) {
      const contextComments = await Comment.findAll({
        attributes: ["createdById", "data"],
        where: {
          [Op.or]: [
            { id: comment.parentCommentId },
            { parentCommentId: comment.parentCommentId },
          ],
        },
      });

      const createdUserIdsInThread = contextComments.map((c) => c.createdById);
      const mentionedUserIdsInThread = contextComments
        .flatMap((c) =>
          ProsemirrorHelper.parseMentions(
            ProsemirrorHelper.toProsemirror(c.data),
            { type: MentionType.User }
          )
        )
        .map((mention) => mention.modelId);

      const userIdsInThread = uniq([
        ...createdUserIdsInThread,
        ...mentionedUserIdsInThread,
      ]);
      recipients = recipients.filter((r) => userIdsInThread.includes(r.id));
    }

    const filtered: User[] = [];

    for (const recipient of recipients) {
      // If this recipient has viewed the document since the comment was made
      // then we can avoid sending them a useless notification, yay.
      const view = await View.findOne({
        where: {
          userId: recipient.id,
          documentId: document.id,
          updatedAt: {
            [Op.gt]: comment.createdAt,
          },
        },
      });

      if (view) {
        Logger.info(
          "processor",
          `suppressing notification to ${recipient.id} because doc viewed`
        );
      } else {
        filtered.push(recipient);
      }
    }

    return filtered;
  };

  /**
   * Get the recipients of a notification for a document event.
   *
   * @param document The document to get recipients for.
   * @param notificationType The notification type for which to find the recipients.
   * @param onlySubscribers Whether to consider only the users who have active subscription to the document.
   * @param actorId The id of the user that performed the action.
   * @returns A list of recipients
   */
  public static getDocumentNotificationRecipients = async ({
    document,
    notificationType,
    onlySubscribers,
    actorId,
  }: {
    document: Document;
    notificationType: NotificationEventType;
    onlySubscribers: boolean;
    actorId: string;
  }): Promise<User[]> => {
    // First find all the users that have notifications enabled for this event
    // type at all and aren't the one that performed the action.
    let recipients = await User.findAll({
      where: {
        id: {
          [Op.ne]: actorId,
        },
        teamId: document.teamId,
      },
    });

    recipients = recipients.filter((recipient) =>
      recipient.subscribedToEventType(notificationType)
    );

    // Filter further to only those that have a subscription to the document…
    if (onlySubscribers) {
      const subscriptions = await Subscription.findAll({
        attributes: ["userId"],
        where: {
          userId: recipients.map((recipient) => recipient.id),
          event: SubscriptionType.Document,
          [Op.or]: [
            { collectionId: document.collectionId },
            { documentId: document.id },
          ],
        },
      });

      const subscribedUserIds = subscriptions.map(
        (subscription) => subscription.userId
      );

      recipients = recipients.filter((recipient) =>
        subscribedUserIds.includes(recipient.id)
      );
    }

    const filtered = [];

    for (const recipient of recipients) {
      if (!recipient.email || recipient.isSuspended) {
        continue;
      }

      // Check the recipient has access to the collection this document is in. Just
      // because they are subscribed doesn't mean they still have access to read
      // the document.
      const doc = await Document.findByPk(document.id, {
        userId: recipient.id,
      });

      if (can(recipient, "read", doc)) {
        filtered.push(recipient);
      }
    }

    return filtered;
  };
}
