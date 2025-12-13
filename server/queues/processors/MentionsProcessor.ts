import { Op } from "sequelize";
import { MentionType } from "@shared/types";
import { Document, Mention, User } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { Event, DocumentEvent, RevisionEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class MentionsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "documents.update",
    "documents.delete",
  ];

  async perform(event: DocumentEvent | RevisionEvent) {
    switch (event.name) {
      case "documents.publish": {
        const document = await Document.findByPk(event.documentId);
        if (!document) {
          return;
        }
        const mentions = DocumentHelper.parseMentions(document, {
          type: MentionType.User,
        });
        await Promise.all(
          mentions.map(async (mention) => {
            const mentionedUser = await User.findByPk(mention.modelId);

            if (
              !mentionedUser ||
              mentionedUser.id === document.lastModifiedById
            ) {
              return;
            }

            await Mention.findOrCreate({
              where: {
                documentId: document.id,
                mentionedUserId: mentionedUser.id,
                mentionId: mention.id,
                mentionType: mention.type,
              },
              defaults: {
                userId: document.lastModifiedById,
              },
            });
          })
        );
        break;
      }

      case "documents.update": {
        const document = await Document.findByPk(event.documentId);
        if (!document) {
          return;
        }

        // mentions are only created for published documents
        if (!document.publishedAt) {
          return;
        }

        const mentions = DocumentHelper.parseMentions(document, {
          type: MentionType.User,
        });
        const mentionIds: string[] = [];

        // create or find existing mention records for mentioned users
        await Promise.all(
          mentions.map(async (mention) => {
            const mentionedUser = await User.findByPk(mention.modelId);

            if (
              !mentionedUser ||
              mentionedUser.id === document.lastModifiedById
            ) {
              return;
            }

            await Mention.findOrCreate({
              where: {
                documentId: document.id,
                mentionedUserId: mentionedUser.id,
                mentionId: mention.id,
                mentionType: mention.type,
              },
              defaults: {
                userId: document.lastModifiedById,
              },
            });
            mentionIds.push(mention.id);
          })
        );

        // delete any mentions that no longer exist
        await Mention.destroy({
          where: {
            mentionId: {
              [Op.notIn]: mentionIds,
            },
            documentId: event.documentId,
          },
        });
        break;
      }

      case "documents.delete": {
        await Mention.destroy({
          where: {
            documentId: event.documentId,
          },
        });
        break;
      }

      default:
    }
  }
}
