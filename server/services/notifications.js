// @flow
import * as Sentry from "@sentry/node";
import type { DocumentEvent, CollectionEvent, Event } from "../events";
import mailer from "../mailer";
import {
  Document,
  Team,
  Collection,
  User,
  NotificationSetting,
} from "../models";
import { Op } from "../sequelize";
import { createQueue } from "../utils/queue";

const notificationsQueue = createQueue("notifications");

notificationsQueue.process(async (job) => {
  const event = job.data;

  try {
    const document = await Document.findByPk(event.documentId);
    if (!document) return;

    // If the document has been updated since we initially queued a notification
    // abort sending a notification – this functions as a debounce.
    if (document.updatedAt > new Date(event.createdAt)) return;

    const { collection } = document;
    if (!collection) return;

    const team = await Team.findByPk(document.teamId);
    if (!team) return;

    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          [Op.ne]: document.lastModifiedById,
        },
        teamId: document.teamId,
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

    const eventName =
      event.name === "documents.publish" ? "published" : "updated";

    notificationSettings.forEach((setting) => {
      // For document updates we only want to send notifications if
      // the document has been edited by the user with this notification setting
      // This could be replaced with ability to "follow" in the future
      if (
        event.name === "documents.update" &&
        !document.collaboratorIds.includes(setting.userId)
      ) {
        return;
      }

      mailer.documentNotification({
        to: setting.user.email,
        eventName,
        document,
        team,
        collection,
        actor: document.updatedBy,
        unsubscribeUrl: setting.unsubscribeUrl,
      });
    });
  } catch (error) {
    if (process.env.SENTRY_DSN) {
      Sentry.withScope(function (scope) {
        scope.setExtra("event", event);
        Sentry.captureException(error);
      });
    } else {
      throw error;
    }
  }
});

export default class Notifications {
  async on(event: Event) {
    switch (event.name) {
      case "documents.publish":
      case "documents.update":
        return this.documentUpdated(event);
      case "collections.create":
        return this.collectionCreated(event);
      default:
    }
  }

  async documentUpdated(event: DocumentEvent) {
    notificationsQueue.add(event, {
      delay: 5 * 60 * 1000,
      removeOnComplete: true,
    });
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
    if (!collection) return;
    if (collection.private) return;

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

    notificationSettings.forEach((setting) =>
      mailer.collectionNotification({
        to: setting.user.email,
        eventName: "created",
        collection,
        actor: collection.user,
        unsubscribeUrl: setting.unsubscribeUrl,
      })
    );
  }
}
