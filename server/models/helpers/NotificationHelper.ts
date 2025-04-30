import uniq from "lodash/uniq";
import uniqBy from "lodash/uniqBy";
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
import { canUserAccessDocument } from "@server/utils/permissions";
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
    let recipients: User[];

    // If this is a reply to another comment, we want to notify all users
    // that are involved in the thread of this comment (i.e. the original
    // comment and all replies to it).
    if (comment.parentCommentId) {
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
      ]).filter((userId) => userId !== actorId);

      recipients = await User.findAll({
        where: {
          id: {
            [Op.in]: userIdsInThread,
          },
          teamId: document.teamId,
        },
      });

      recipients = recipients.filter((recipient) =>
        recipient.subscribedToEventType(NotificationEventType.CreateComment)
      );
    } else {
      recipients = await this.getDocumentNotificationRecipients({
        document,
        notificationType: NotificationEventType.CreateComment,
        actorId,
        // We will check below, this just prevents duplicate queries
        disableAccessCheck: true,
      });
    }

    const filtered: User[] = [];

    for (const recipient of recipients) {
      if (recipient.isSuspended) {
        continue;
      }

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
        continue;
      }

      // Check the recipient has access to the collection this document is in. Just
      // because they are subscribed doesn't mean they still have access to read
      // the document.
      if (await canUserAccessDocument(recipient, document.id)) {
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
   * @param actorId The id of the user that performed the action.
   * @param disableAccessCheck Whether to disable the access check for the document.
   * @returns A list of recipients
   */
  public static getDocumentNotificationRecipients = async ({
    document,
    notificationType,
    actorId,
    disableAccessCheck = false,
  }: {
    document: Document;
    notificationType: NotificationEventType;
    actorId: string;
    disableAccessCheck?: boolean;
  }): Promise<User[]> => {
    let recipients: User[];

    if (notificationType === NotificationEventType.PublishDocument) {
      recipients = await User.findAll({
        where: {
          id: {
            [Op.ne]: actorId,
          },
          teamId: document.teamId,
          notificationSettings: {
            [notificationType]: true,
          },
        },
      });
    } else {
      const subscriptions = await Subscription.findAll({
        where: {
          userId: {
            [Op.ne]: actorId,
          },
          event: SubscriptionType.Document,
          ...(document.collectionId
            ? {
                [Op.or]: [
                  { collectionId: document.collectionId },
                  { documentId: document.id },
                ],
              }
            : {
                documentId: document.id,
              }),
        },
        include: [
          {
            association: "user",
            required: true,
          },
        ],
      });

      recipients = uniqBy(
        subscriptions.map((s) => s.user),
        (user) => user.id
      );
    }

    const filtered = [];

    for (const recipient of recipients) {
      if (
        recipient.isSuspended ||
        !recipient.subscribedToEventType(notificationType)
      ) {
        continue;
      }

      // Check the recipient has access to the collection this document is in. Just
      // because they are subscribed doesn't mean they still have access to read
      // the document.
      if (
        disableAccessCheck ||
        (await canUserAccessDocument(recipient, document.id))
      ) {
        filtered.push(recipient);
      }
    }

    return filtered;
  };
}
