// @flow
import debug from "debug";
import type {
  DocumentEvent,
  RevisionEvent,
  CollectionEvent,
  Event,
} from "../events";
import mailer from "../mailer";
import {
  View,
  Document,
  Team,
  Collection,
  Revision,
  User,
  NotificationSetting,
  Attachment,
} from "../models";
import { Op } from "../sequelize";
import markdownDiff from "../utils/markdownDiff";

import parseAttachmentIds from "../utils/parseAttachmentIds";
import { getSignedImageUrl } from "../utils/s3";

const log = debug("services");

async function replaceImageAttachments(text: string) {
  const attachmentIds = parseAttachmentIds(text);

  await Promise.all(
    attachmentIds.map(async (id) => {
      const attachment = await Attachment.findByPk(id);
      if (attachment) {
        const accessUrl = await getSignedImageUrl(attachment.key, 86400 * 4);
        text = text.replace(attachment.redirectUrl, accessUrl);
      }
    })
  );

  return text;
}

export default class Notifications {
  async on(event: Event) {
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
    // never send notifications when batch importing documents
    if (event.data && event.data.source === "import") return;

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

    const eventName = "published";

    for (const setting of notificationSettings) {
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
        log(
          `suppressing notification to ${setting.userId} because update viewed`
        );
        continue;
      }

      mailer.documentNotification({
        to: setting.user.email,
        eventName,
        document,
        team,
        collection,
        summary: document.getSummary(),
        actor: document.updatedBy,
        unsubscribeUrl: setting.unsubscribeUrl,
      });
    }
  }

  async revisionCreated(event: RevisionEvent) {
    const revision = await Revision.findByPk(event.modelId, {
      include: [
        {
          model: Document,
          as: "document",
          include: [
            {
              model: Collection,
              as: "collection",
            },
          ],
        },
      ],
    });
    if (!revision) return;

    const { document } = revision;
    const { collection } = document;
    if (!collection || !document) return;

    const team = await Team.findByPk(document.teamId);
    if (!team) return;

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

    const eventName = "updated";

    for (const setting of notificationSettings) {
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
            [Op.gt]: document.updatedAt,
          },
        },
      });

      if (view) {
        log(
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

      let summary = markdownDiff(previous ? previous.text : "", revision.text);

      console.log(summary);
      summary = await replaceImageAttachments(summary);
      console.log(summary);

      mailer.documentNotification({
        to: setting.user.email,
        eventName,
        document,
        team,
        collection,
        summary,
        actor: revision.user,
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
    if (!collection.permission) return;

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
