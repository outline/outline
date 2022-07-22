import { Op } from "sequelize";
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
import {
  CollectionEvent,
  RevisionEvent,
  Event,
  DocumentActionEvent,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class NotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "collections.create",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.publish":
        return this.documentPublished(event);

      case "revisions.create":
        return this.documentUpdated(event);

      case "collections.create":
        return this.collectionCreated(event);

      default:
    }
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
      const notify = await shouldNotify({
        user: recipient.user,
        userId: recipient.userId,
        document: document,
        documentId: event.documentId,
        event: event,
        eventName: "published",
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

  async documentUpdated(event: RevisionEvent) {
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
      const notify = await shouldNotify({
        user: recipient.user,
        userId: recipient.userId,
        document: document,
        documentId: event.documentId,
        event: event,
        eventName: "updated",
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
}

type Notifiable = {
  user: User;
  userId: string;
  document: Document;
  documentId: string;
  event: DocumentActionEvent | RevisionEvent;
  eventName: string;
};

const shouldNotify = async (subject: Notifiable): Promise<boolean> => {
  // Suppress notifications for suspended users
  if (subject.user.isSuspended) {
    return false;
  }

  // Check the user has access to the
  // collection this document is in.
  // Just because they were a collaborator once
  // doesn't mean they still are.
  const collectionIds = await subject.user.collectionIds();
  if (!collectionIds.includes(subject.document.collectionId)) {
    return false;
  }

  // If this user has viewed the document since the last update was made
  // then we can avoid sending them a useless notification, yay.
  const view = await View.findOne({
    where: {
      userId: subject.userId,
      documentId: subject.event.documentId,
      updatedAt: {
        [Op.gt]: subject.document.updatedAt,
      },
    },
  });

  if (view) {
    Logger.info(
      "processor",
      `suppressing notification to ${subject.userId} because update viewed`
    );
    return false;
  }

  if (!subject.user.email) {
    return false;
  }

  return true;
};
