// @flow
import debug from "debug";
import type { DocumentEvent, CollectionEvent, Event } from "../events";
import mailer from "../mailer";
import {
  View,
  Document,
  Team,
  Collection,
  User,
  NotificationSetting,
} from "../models";
import { Op } from "../sequelize";

const log = debug("services");

export default class Notifications {
  async on(event: Event) {
    switch (event.name) {
      case "documents.publish":
      case "documents.update.debounced":
        return this.documentUpdated(event);
      case "collections.create":
        return this.collectionCreated(event);
      default:
    }
  }

  async documentUpdated(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document) return;

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
        event:
          event.name === "documents.publish"
            ? "documents.publish"
            : "documents.update",
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

    for (const setting of notificationSettings) {
      // For document updates we only want to send notifications if
      // the document has been edited by the user with this notification setting
      // This could be replaced with ability to "follow" in the future
      if (
        eventName === "updated" &&
        !document.collaboratorIds.includes(setting.userId)
      ) {
        return;
      }

      // Check the user has access to the collection this document is in. Just
      // because they were a collaborator once doesn't mean they still are.
      const collectionIds = await setting.user.collectionIds();
      if (!collectionIds.includes(document.collectionId)) {
        return;
      }

      // If this user has viewed the document since the last update was made
      // then we can avoid sending them a useless notification, yay.
      const view = await View.findOne({
        where: {
          userId: setting.userId,
          documentId: event.documentId,
          updatedAt: {
            [Op.gt]: document.updatedAt,
          },
        },
      });

      if (view) {
        log(
          `suppressing notification to ${setting.userId} because update viewed`
        );
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
