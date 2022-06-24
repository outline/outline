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
  Revision,
  Attachment,
} from "@server/models";
import {
  DocumentEvent,
  CollectionEvent,
  RevisionEvent,
  Event,
} from "@server/types";
import markdownDiff from "@server/utils/markdownDiff";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import { getSignedUrl } from "@server/utils/s3";
import BaseProcessor from "./BaseProcessor";

async function replaceImageAttachments(text: string) {
  const attachmentIds = parseAttachmentIds(text);

  await Promise.all(
    attachmentIds.map(async (id) => {
      const attachment = await Attachment.findByPk(id);
      if (attachment) {
        const accessUrl = await getSignedUrl(attachment.key, 86400 * 4);
        text = text.replace(attachment.redirectUrl, accessUrl);
      }
    })
  );

  return text;
}

export default class NotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "collections.create",
  ];

  async perform(event: Event) {
    // never send notifications when batch importing documents
    // @ts-expect-error More granular typing of events needed here
    if (event.data?.source === "import") {
      return;
    }

    switch (event.name) {
      case "documents.publish":
        return this.documentPublished(event);
      case "revisions.create":
        return this.revisionCreated(event);
      case "collections.create":
        return this.collectionCreated(event);

      default:
    }
  }

  async documentPublished(event: DocumentEvent) {
    const [collection, document, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId),
      Team.findByPk(event.teamId),
    ]);
    if (!document || !team || !collection) {
      return;
    }
    const notificationSettings = await NotificationSetting.findAll({
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

    for (const setting of notificationSettings) {
      // Suppress notifications for suspended users
      if (setting.user.isSuspended || !setting.user.email) {
        continue;
      }

      // Check the user has access to the collection this document is in. Just
      // because they were a collaborator once doesn't mean they still are.
      const collectionIds = await setting.user.collectionIds();

      if (!collectionIds.includes(document.collectionId)) {
        continue;
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
        Logger.info(
          "processor",
          `suppressing notification to ${setting.userId} because update viewed`
        );
        continue;
      }

      const content = await replaceImageAttachments(document.getSummary());

      await DocumentNotificationEmail.schedule({
        to: setting.user.email,
        eventName: "published",
        documentId: document.id,
        teamUrl: team.url,
        actorName: document.updatedBy.name,
        collectionName: collection.name,
        unsubscribeUrl: setting.unsubscribeUrl,
        content,
      });
    }
  }

  async revisionCreated(event: RevisionEvent) {
    const [collection, document, team, revision] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId),
      Team.findByPk(event.teamId),
      Revision.findByPk(event.modelId),
    ]);
    if (!document || !revision || !team || !collection) {
      return;
    }
    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          [Op.ne]: revision.userId,
        },
        teamId: document.teamId,
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

    for (const setting of notificationSettings) {
      // Suppress notifications for suspended users
      if (setting.user.isSuspended || !setting.user.email) {
        continue;
      }

      // For document updates we only want to send notifications if
      // the document has been edited by the user with this notification setting
      // This could be replaced with ability to "follow" in the future
      if (!document.collaboratorIds.includes(setting.userId)) {
        continue;
      }

      // Check the user has access to the collection this document is in. Just
      // because they were a collaborator once doesn't mean they still are.
      const collectionIds = await setting.user.collectionIds();

      if (!collectionIds.includes(document.collectionId)) {
        continue;
      }

      // If this user has viewed the document since the last update was made
      // then we can avoid sending them a useless notification, yay.
      const view = await View.findOne({
        where: {
          userId: setting.userId,
          documentId: event.documentId,
          updatedAt: {
            [Op.gt]: revision.createdAt,
          },
        },
      });

      if (view) {
        Logger.info(
          "processor",
          `suppressing notification to ${setting.userId} because update viewed`
        );
        continue;
      }

      const previous = await Revision.findOne({
        where: {
          documentId: document.id,
          createdAt: {
            [Op.lt]: revision.createdAt,
          },
        },
        order: [["createdAt", "DESC"]],
      });

      let content = markdownDiff(previous ? previous.text : "", revision.text);
      content = await replaceImageAttachments(content);

      await DocumentNotificationEmail.schedule({
        to: setting.user.email,
        eventName: "updated",
        documentId: document.id,
        teamUrl: team.url,
        actorName: document.updatedBy.name,
        collectionName: collection.name,
        unsubscribeUrl: setting.unsubscribeUrl,
        content,
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
