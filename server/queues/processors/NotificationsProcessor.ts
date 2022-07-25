import { Op } from "sequelize";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { sequelize } from "@server/database/sequelize";
import CollectionNotificationEmail from "@server/emails/templates/CollectionNotificationEmail";
import DocumentNotificationEmail from "@server/emails/templates/DocumentNotificationEmail";
import Logger from "@server/logging/Logger";
import {
  View,
  Document,
  Team,
  Collection,
  User,
  NotificationSetting,
  Subscription,
} from "@server/models";
import { can } from "@server/policies";
import {
  CollectionEvent,
  RevisionEvent,
  Event,
  DocumentActionEvent,
  DocumentEvent,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class NotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.update",
    "documents.publish",
    "revisions.create",
    "collections.create",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.publish":
        return this.documentPublished(event);

      case "documents.update":
        return this.documentUpdated(event);

      case "revisions.create":
        return this.revisionCreated(event);

      case "collections.create":
        return this.collectionCreated(event);

      default:
    }
  }

  // Create subscriptions when document is updated.
  async documentUpdated(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId);

    // `event.name` will be `documents.update`
    if (!document || event.name !== "documents.update") {
      return;
    }

    // Create subscriptions for newly updated document.
    await this.createSubscriptions(document, event);
  }

  async documentPublished(event: DocumentActionEvent) {
    // never send notifications when batch importing documents
    if (event.data?.source === "import") {
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

    // Create subscriptions for newly published document.
    await this.createSubscriptions(document, event);

    // Publish notifications
    const recipients = await NotificationSetting.findAll({
      where: {
        userId: {
          [Op.ne]: document.lastModifiedById,
        },
        teamId: document.teamId,
        event: "documents.publish",
      },
      include: [
        {
          model: User,
          required: true,
          as: "user",
        },
      ],
    });

    for (const recipient of recipients) {
      const notify = await this.shouldNotify({
        user: recipient.user,
        document: document,
        event: event,
      });

      if (notify) {
        await DocumentNotificationEmail.schedule({
          to: recipient.user.email,
          eventName: "published",
          documentId: document.id,
          teamUrl: team.url,
          actorName: document.updatedBy.name,
          collectionName: collection.name,
          unsubscribeUrl: recipient.unsubscribeUrl,
        });
      }
    }
  }

  async revisionCreated(event: RevisionEvent) {
    const [collection, document, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !collection) {
      return;
    }

    // Document update notifications
    // Should be similar to notifications.
    const subscriptions = await Subscription.findAll({
      where: {
        userId: {
          [Op.ne]: document.lastModifiedById,
        },
        documentId: document.id,
        event: "documents.update",
      },
      include: [
        {
          model: User,
          required: true,
          as: "user",
        },
      ],
    });

    for (const recipient of subscriptions) {
      const notify = await this.shouldNotify({
        user: recipient.user,
        document: document,
        event: event,
      });

      if (notify) {
        await DocumentNotificationEmail.schedule({
          to: recipient.user.email,
          eventName: "updated",
          documentId: document.id,
          teamUrl: team.url,
          actorName: document.updatedBy.name,
          collectionName: collection.name,
          unsubscribeUrl: recipient.document?.url,
        });
      }
    }
  }

  async collectionCreated(event: CollectionEvent) {
    const collection = await Collection.findByPk(event.collectionId, {
      include: [
        {
          model: User,
          required: true,
          as: "user",
        },
      ],
    });
    if (!collection) {
      return;
    }
    if (!collection.permission) {
      return;
    }
    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          [Op.ne]: collection.createdById,
        },
        teamId: collection.teamId,
        event: event.name,
      },
      include: [
        {
          model: User,
          required: true,
          as: "user",
        },
      ],
    });

    for (const setting of notificationSettings) {
      // Suppress notifications for suspended users
      if (setting.user.isSuspended || !setting.user.email) {
        continue;
      }

      await CollectionNotificationEmail.schedule({
        to: setting.user.email,
        eventName: "created",
        collectionId: collection.id,
        unsubscribeUrl: setting.unsubscribeUrl,
      });
    }
  }

  private createSubscriptions = async (
    document: Document,
    event: DocumentEvent
  ): Promise<void> => {
    const collaboratorIds = document.collaboratorIds;

    for (const collaboratorId of collaboratorIds) {
      await sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(collaboratorId, { transaction });

        if (user) {
          // `user` has to have `createSubscription` permission on `document`.
          if (can(user, "createSubscription", document)) {
            // `subscriptionCreator` uses `findOrCreate`.
            // A duplicate won't be created if a subscription
            // exists already.
            const exists = await Subscription.findOne({
              where: { userId: user.id, documentId: document.id },
              transaction,
            });

            // Avoid recreating subscription if user has
            // manually unsubscribed before.
            if (!exists) {
              await subscriptionCreator({
                user: user,
                documentId: document.id,
                event: "documents.update",
                transaction,
                ip: event.ip,
              });
            }
          }
        }
      });
    }
  };

  private shouldNotify = async (subject: {
    user: User;
    document: Document;
    event: DocumentActionEvent | RevisionEvent;
  }): Promise<boolean> => {
    // Suppress notifications for suspended users
    if (subject.user.isSuspended) {
      return false;
    }

    // Check the user has access to the collection this document is in.
    // Just because they were a collaborator once doesn't mean they still are.
    const collectionIds = await subject.user.collectionIds();
    if (!collectionIds.includes(subject.document.collectionId)) {
      return false;
    }

    // If this user has viewed the document since the last update was made
    // then we can avoid sending them a useless notification, yay.
    const view = await View.findOne({
      where: {
        userId: subject.user.id,
        documentId: subject.event.documentId,
        updatedAt: {
          [Op.gt]: subject.document.updatedAt,
        },
      },
    });

    if (view) {
      Logger.info(
        "processor",
        `suppressing notification to ${subject.user.id} because update viewed`
      );
      return false;
    }

    if (!subject.user.email) {
      return false;
    }

    return true;
  };
}
