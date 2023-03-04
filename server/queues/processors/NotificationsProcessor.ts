import { subHours } from "date-fns";
import { uniqBy } from "lodash";
import { Node } from "prosemirror-model";
import { Op } from "sequelize";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { sequelize } from "@server/database/sequelize";
import { schema } from "@server/editor";
import CollectionNotificationEmail from "@server/emails/templates/CollectionNotificationEmail";
import CommentCreatedEmail from "@server/emails/templates/CommentCreatedEmail";
import DocumentNotificationEmail from "@server/emails/templates/DocumentNotificationEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  View,
  Document,
  Team,
  Collection,
  User,
  NotificationSetting,
  Subscription,
  Notification,
  Revision,
  Comment,
} from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import ProsemirrorHelper from "@server/models/helpers/ProsemirrorHelper";
import {
  CollectionEvent,
  RevisionEvent,
  Event,
  DocumentEvent,
  CommentEvent,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class NotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "collections.create",
    "comments.create",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.publish":
        return this.documentPublished(event);
      case "revisions.create":
        return this.revisionCreated(event);
      case "collections.create":
        return this.collectionCreated(event);
      case "comments.create":
        return this.commentCreated(event);
      default:
    }
  }

  async commentCreated(event: CommentEvent) {
    const [document, comment, team] = await Promise.all([
      Document.scope("withCollection").findOne({
        where: {
          id: event.documentId,
        },
      }),
      Comment.findByPk(event.modelId),
      Team.findByPk(event.teamId),
    ]);
    if (!document || !comment || !team) {
      return;
    }

    // Commenting on a doc automatically creates a subscription to the doc
    // if they haven't previously had one.
    await sequelize.transaction(async (transaction) => {
      await subscriptionCreator({
        user: comment.createdBy,
        documentId: document.id,
        event: "documents.update",
        resubscribe: false,
        transaction,
        ip: event.ip,
      });
    });

    const recipients = await this.getCommentNotificationRecipients(
      document,
      comment,
      comment.createdById
    );
    if (!recipients.length) {
      return;
    }

    let content = ProsemirrorHelper.toHTML(
      Node.fromJSON(schema, comment.data),
      {
        centered: false,
      }
    );
    if (!content) {
      return;
    }

    content = await DocumentHelper.attachmentsToSignedUrls(
      content,
      event.teamId,
      86400 * 4
    );

    for (const recipient of recipients) {
      const notify = await this.shouldNotify(document, recipient.user);

      if (notify) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.user.id,
          actorId: comment.createdById,
          teamId: team.id,
          documentId: document.id,
        });
        await CommentCreatedEmail.schedule(
          {
            to: recipient.user.email,
            documentId: document.id,
            teamUrl: team.url,
            isReply: !!comment.parentCommentId,
            actorName: comment.createdBy.name,
            commentId: comment.id,
            content,
            collectionName: document.collection?.name,
            unsubscribeUrl: recipient.unsubscribeUrl,
          },
          { notificationId: notification.id }
        );
      }
    }
  }

  async documentPublished(event: DocumentEvent) {
    // never send notifications when batch importing documents
    if (
      "data" in event &&
      "source" in event.data &&
      event.data.source === "import"
    ) {
      return;
    }

    const [collection, document, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !collection) {
      return;
    }

    await this.createDocumentSubscriptions(document, event);

    const recipients = await this.getDocumentNotificationRecipients(
      document,
      "documents.publish",
      document.lastModifiedById
    );

    for (const recipient of recipients) {
      const notify = await this.shouldNotify(document, recipient.user);

      if (notify) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.user.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });
        await DocumentNotificationEmail.schedule(
          {
            to: recipient.user.email,
            eventName: "published",
            documentId: document.id,
            teamUrl: team.url,
            actorName: document.updatedBy.name,
            collectionName: collection.name,
            unsubscribeUrl: recipient.unsubscribeUrl,
          },
          { notificationId: notification.id }
        );
      }
    }
  }

  async revisionCreated(event: RevisionEvent) {
    const [collection, document, revision, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId),
      Revision.findByPk(event.modelId),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !revision || !collection) {
      return;
    }

    await this.createDocumentSubscriptions(document, event);

    const recipients = await this.getDocumentNotificationRecipients(
      document,
      "documents.update",
      document.lastModifiedById
    );
    if (!recipients.length) {
      return;
    }

    // generate the diff html for the email
    const before = await revision.previous();
    const content = await DocumentHelper.toEmailDiff(before, revision, {
      includeTitle: false,
      centered: false,
      signedUrls: 86400 * 4,
    });
    if (!content) {
      return;
    }

    for (const recipient of recipients) {
      const notify = await this.shouldNotify(document, recipient.user);

      if (notify) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.user.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });

        await DocumentNotificationEmail.schedule(
          {
            to: recipient.user.email,
            eventName: "updated",
            documentId: document.id,
            teamUrl: team.url,
            actorName: document.updatedBy.name,
            collectionName: collection.name,
            unsubscribeUrl: recipient.unsubscribeUrl,
            content,
          },
          { notificationId: notification.id }
        );
      }
    }
  }

  async collectionCreated(event: CollectionEvent) {
    const collection = await Collection.scope("withUser").findByPk(
      event.collectionId
    );

    if (!collection || !collection.permission) {
      return;
    }

    const recipients = await this.getCollectionNotificationRecipients(
      collection,
      event.name
    );

    for (const recipient of recipients) {
      // Suppress notifications for suspended users
      if (recipient.user.isSuspended || !recipient.user.email) {
        continue;
      }

      await CollectionNotificationEmail.schedule({
        to: recipient.user.email,
        eventName: "created",
        collectionId: collection.id,
        unsubscribeUrl: recipient.unsubscribeUrl,
      });
    }
  }

  /**
   * Create any new subscriptions that might be missing for collaborators in the
   * document on publish and revision creation. This does mean that there is a
   * short period of time where the user is not subscribed after editing until a
   * revision is created.
   *
   * @param document The document to create subscriptions for
   * @param event The event that triggered the subscription creation
   */
  private createDocumentSubscriptions = async (
    document: Document,
    event: DocumentEvent | RevisionEvent
  ): Promise<void> => {
    await sequelize.transaction(async (transaction) => {
      const users = await document.collaborators({ transaction });

      for (const user of users) {
        await subscriptionCreator({
          user,
          documentId: document.id,
          event: "documents.update",
          resubscribe: false,
          transaction,
          ip: event.ip,
        });
      }
    });
  };

  /**
   * Get the recipients of a notification for a collection event.
   *
   * @param collection The collection to get recipients for
   * @param eventName The event name
   * @returns A list of recipients
   */
  private getCollectionNotificationRecipients = async (
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

  private getCommentNotificationRecipients = async (
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
  private getDocumentNotificationRecipients = async (
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

    // Ensure we only have one recipient per user as a safety measure
    return uniqBy(recipients, "userId");
  };

  private shouldNotify = async (
    document: Document,
    user: User
  ): Promise<boolean> => {
    // Suppress notifications for suspended and users with no email address
    if (user.isSuspended || !user.email) {
      return false;
    }

    // Check the recipient has access to the collection this document is in. Just
    // because they are subscribed doesn't meant they still have access to read
    // the document.
    const collectionIds = await user.collectionIds();

    if (!collectionIds.includes(document.collectionId)) {
      return false;
    }

    // Deliver only a single notification in a 12 hour window
    const notification = await Notification.findOne({
      order: [["createdAt", "DESC"]],
      where: {
        userId: user.id,
        documentId: document.id,
        emailedAt: {
          [Op.not]: null,
          [Op.gte]: subHours(new Date(), 12),
        },
      },
    });

    if (notification) {
      if (env.ENVIRONMENT === "development") {
        Logger.info(
          "processor",
          `would have suppressed notification to ${user.id}, but not in development`
        );
      } else {
        Logger.info(
          "processor",
          `suppressing notification to ${user.id} as recently notified`
        );
        return false;
      }
    }

    // If this recipient has viewed the document since the last update was made
    // then we can avoid sending them a useless notification, yay.
    const view = await View.findOne({
      where: {
        userId: user.id,
        documentId: document.id,
        updatedAt: {
          [Op.gt]: document.updatedAt,
        },
      },
    });

    if (view) {
      Logger.info(
        "processor",
        `suppressing notification to ${user.id} because update viewed`
      );
      return false;
    }

    return true;
  };
}
