import { uniqBy } from "lodash";
import { Op } from "sequelize";
import {
  Document,
  Collection,
  NotificationSetting,
  Subscription,
  Comment,
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
    const recipients = await this.getDocumentNotificationRecipients(
      document,
      "documents.update",
      actorId
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
      return recipients.filter((r) => userIdsInThread.includes(r.userId));
    }

    return recipients;
  };

  /**
   * Get the recipients of a notification for a document event.
   *
   * @param document The document to get recipients for
   * @param eventName The event name
   * @param actorId The id of the user that performed the action
   * @returns A list of recipients
   */
  public static getDocumentNotificationRecipients = async (
    document: Document,
    eventName: string,
    actorId: string
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

    // If the event is a revision creation we can filter further to only those
    // that have a subscription to the document…
    if (eventName === "documents.update") {
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

    recipients = recipients
      .filter((recipient) => {
        // Suppress notifications for suspended and users with no email address
        return recipient.user.email && !recipient.user.isSuspended;
      })
      .filter(async (recipient) => {
        // Check the recipient has access to the collection this document is in. Just
        // because they are subscribed doesn't meant they still have access to read
        // the document.
        const collectionIds = await recipient.user.collectionIds();
        return collectionIds.includes(document.collectionId);
      });

    // Ensure we only have one recipient per user as a safety measure
    return uniqBy(recipients, "userId");
  };
}
