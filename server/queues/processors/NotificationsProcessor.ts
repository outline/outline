import { subHours } from "date-fns";
import { differenceBy } from "lodash";
import { Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import { Minute } from "@shared/utils/time";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { sequelize } from "@server/database/sequelize";
import CollectionNotificationEmail from "@server/emails/templates/CollectionNotificationEmail";
import DocumentNotificationEmail from "@server/emails/templates/DocumentNotificationEmail";
import MentionNotificationEmail from "@server/emails/templates/MentionNotificationEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  Document,
  Team,
  Collection,
  Notification,
  Revision,
  User,
  View,
} from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import {
  CollectionEvent,
  RevisionEvent,
  Event,
  DocumentEvent,
  CommentEvent,
} from "@server/types";
import CommentCreatedNotificationTask from "../tasks/CommentCreatedNotificationTask";
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
    await CommentCreatedNotificationTask.schedule(event, {
      delay: Minute,
    });
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
      Document.findByPk(event.documentId, { includeState: true }),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !collection) {
      return;
    }

    await this.createDocumentSubscriptions(document, event);

    // Send notifications to mentioned users first
    const mentions = DocumentHelper.parseMentions(document);
    const userIdsSentNotifications: string[] = [];

    for (const mention of mentions) {
      const [recipient, actor] = await Promise.all([
        User.findByPk(mention.modelId),
        User.findByPk(mention.actorId),
      ]);
      if (recipient && actor && recipient.id !== actor.id) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });
        userIdsSentNotifications.push(recipient.id);
        await MentionNotificationEmail.schedule(
          {
            to: recipient.email,
            documentId: event.documentId,
            actorName: actor.name,
            teamUrl: team.url,
            mentionId: mention.id,
          },
          { notificationId: notification.id }
        );
      }
    }

    const recipients = (
      await NotificationHelper.getDocumentNotificationRecipients(
        document,
        NotificationEventType.PublishDocument,
        document.lastModifiedById,
        false
      )
    ).filter((recipient) => !userIdsSentNotifications.includes(recipient.id));

    for (const recipient of recipients) {
      const notify = await this.shouldNotify(document, recipient);

      if (notify) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });
        await DocumentNotificationEmail.schedule(
          {
            to: recipient.email,
            userId: recipient.id,
            eventName: "published",
            documentId: document.id,
            teamUrl: team.url,
            actorName: document.updatedBy.name,
            collectionName: collection.name,
          },
          { notificationId: notification.id }
        );
      }
    }
  }

  async revisionCreated(event: RevisionEvent) {
    const [collection, document, revision, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId, { includeState: true }),
      Revision.findByPk(event.modelId),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !revision || !collection) {
      return;
    }

    await this.createDocumentSubscriptions(document, event);

    // Send notifications to mentioned users first
    const prev = await revision.previous();
    const oldMentions = prev ? DocumentHelper.parseMentions(prev) : [];
    const newMentions = DocumentHelper.parseMentions(document);
    const mentions = differenceBy(newMentions, oldMentions, "id");
    const userIdsSentNotifications: string[] = [];

    for (const mention of mentions) {
      const [recipient, actor] = await Promise.all([
        User.findByPk(mention.modelId),
        User.findByPk(mention.actorId),
      ]);
      if (recipient && actor && recipient.id !== actor.id) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });
        userIdsSentNotifications.push(recipient.id);
        await MentionNotificationEmail.schedule(
          {
            to: recipient.email,
            documentId: event.documentId,
            actorName: actor.name,
            teamUrl: team.url,
            mentionId: mention.id,
          },
          { notificationId: notification.id }
        );
      }
    }

    const recipients = (
      await NotificationHelper.getDocumentNotificationRecipients(
        document,
        NotificationEventType.UpdateDocument,
        document.lastModifiedById,
        true
      )
    ).filter((recipient) => !userIdsSentNotifications.includes(recipient.id));
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
      const notify = await this.shouldNotify(document, recipient);

      if (notify) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });

        await DocumentNotificationEmail.schedule(
          {
            to: recipient.email,
            eventName: "updated",
            documentId: document.id,
            teamUrl: team.url,
            actorName: document.updatedBy.name,
            collectionName: collection.name,
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

    const recipients = await NotificationHelper.getCollectionNotificationRecipients(
      collection,
      NotificationEventType.CreateCollection
    );

    for (const recipient of recipients) {
      // Suppress notifications for suspended users
      if (recipient.isSuspended || !recipient.email) {
        continue;
      }

      await CollectionNotificationEmail.schedule({
        to: recipient.email,
        userId: recipient.id,
        eventName: "created",
        collectionId: collection.id,
      });
    }
  }

  private shouldNotify = async (
    document: Document,
    user: User
  ): Promise<boolean> => {
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
}
