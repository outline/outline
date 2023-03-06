import { uniqBy } from "lodash";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import {
  Document,
  Collection,
  NotificationSetting,
  Subscription,
  Comment,
  View,
} from "@server/models";

export default class NotificationHelper {
  /**
   * Get the recipients of a notification for a collection event.
   *
   * @param collection The collection to get recipients for
   * @param eventName The event name
   * @returns A list of recipients
   */
  public static getCollectionNotificationRecipients = async (
    collection: Collection,
    eventName: string
  ): Promise<NotificationSetting[]> => {
    // First find all the users that have notifications enabled for this event
    // type at all and aren't the one that performed the action.
    const recipients = await NotificationSetting.scope("withUser").findAll({
      where: {
        userId: {
          [Op.ne]: collection.createdById,
        },
        teamId: collection.teamId,
        event: eventName,
      },
    });

    // Ensure we only have one recipient per user as a safety measure
    return uniqBy(recipients, "userId");
  };

  /**
   * Get the recipients of a notification for a comment event.
   *
   * @param document The document associated with the comment
   * @param comment The comment to get recipients for
   * @param eventName The event name
   * @returns A list of recipients
   */
  public static getCommentNotificationRecipients = async (
    document: Document,
    comment: Comment,
    actorId: string
  ): Promise<NotificationSetting[]> => {
    let recipients = await this.getDocumentNotificationRecipients(
      document,
      "documents.update",
      actorId,
      !comment.parentCommentId
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
      recipients = recipients.filter((r) => userIdsInThread.includes(r.userId));
    }

    const filtered: NotificationSetting[] = [];

    for (const recipient of recipients) {
      // If this recipient has viewed the document since the comment was made
      // then we can avoid sending them a useless notification, yay.
      const view = await View.findOne({
        where: {
          userId: recipient.userId,
          documentId: document.id,
          updatedAt: {
            [Op.gt]: comment.createdAt,
          },
        },
      });

      if (view) {
        Logger.info(
          "processor",
          `suppressing notification to ${recipient.userId} because doc viewed`
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
   * @param eventName The event name.
   * @param actorId The id of the user that performed the action.
   * @param onlySubscribers Whether to only return recipients that are actively
   * subscribed to the document.
   * @returns A list of recipients
   */
  public static getDocumentNotificationRecipients = async (
    document: Document,
    eventName: string,
    actorId: string,
    onlySubscribers: boolean
  ): Promise<NotificationSetting[]> => {
    // First find all the users that have notifications enabled for this event
    // type at all and aren't the one that performed the action.
    let recipients = await NotificationSetting.scope("withUser").findAll({
      where: {
        userId: {
          [Op.ne]: actorId,
        },
        teamId: document.teamId,
        event: eventName,
      },
    });

    // Filter further to only those that have a subscription to the document…
    if (onlySubscribers) {
      const subscriptions = await Subscription.findAll({
        attributes: ["userId"],
        where: {
          userId: recipients.map((recipient) => recipient.user.id),
          documentId: document.id,
          event: eventName,
        },
      });

      const subscribedUserIds = subscriptions.map(
        (subscription) => subscription.userId
      );

      recipients = recipients.filter((recipient) =>
        subscribedUserIds.includes(recipient.user.id)
      );
    }

    const filtered = [];

    for (const recipient of recipients) {
      const collectionIds = await recipient.user.collectionIds();

      // Check the recipient has access to the collection this document is in. Just
      // because they are subscribed doesn't meant they "still have access to read
      // the document.
      if (
        recipient.user.email &&
        !recipient.user.isSuspended &&
        collectionIds.includes(document.collectionId)
      ) {
        filtered.push(recipient);
      }
    }

    // Ensure we only have one recipient per user as a safety measure
    return uniqBy(filtered, "userId");
  };
}
