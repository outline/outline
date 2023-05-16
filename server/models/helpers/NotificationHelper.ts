import { Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import Logger from "@server/logging/Logger";
import {
  User,
  Document,
  Collection,
  Subscription,
  Comment,
  View,
} from "@server/models";

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
    let recipients = await this.getDocumentNotificationRecipients(
      document,
      NotificationEventType.UpdateDocument,
      actorId,
      !comment.parentCommentId
    );

    recipients = recipients.filter((recipient) =>
      recipient.subscribedToEventType(NotificationEventType.CreateComment)
    );

    if (recipients.length > 0 && comment.parentCommentId) {
      const contextComments = await Comment.findAll({
        attributes: ["createdById"],
        where: {
          [Op.or]: [
            { id: comment.parentCommentId },
            { parentCommentId: comment.parentCommentId },
          ],
        },
      });

      const userIdsInThread = contextComments.map((c) => c.createdById);
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
   * @param eventType The event name.
   * @param actorId The id of the user that performed the action.
   * @param onlySubscribers Whether to only return recipients that are actively
   * subscribed to the document.
   * @returns A list of recipients
   */
  public static getDocumentNotificationRecipients = async (
    document: Document,
    eventType: NotificationEventType,
    actorId: string,
    onlySubscribers: boolean
  ): Promise<User[]> => {
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
      recipient.subscribedToEventType(eventType)
    );

    // Filter further to only those that have a subscription to the document…
    if (onlySubscribers) {
      const subscriptions = await Subscription.findAll({
        attributes: ["userId"],
        where: {
          userId: recipients.map((recipient) => recipient.id),
          documentId: document.id,
          event: eventType,
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
      const collectionIds = await recipient.collectionIds();

      // Check the recipient has access to the collection this document is in. Just
      // because they are subscribed doesn't mean they still have access to read
      // the document.
      if (
        recipient.email &&
        !recipient.isSuspended &&
        document.collectionId &&
        collectionIds.includes(document.collectionId)
      ) {
        filtered.push(recipient);
      }
    }

    return filtered;
  };
}
