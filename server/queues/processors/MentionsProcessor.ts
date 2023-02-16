import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Document, Mention, User } from "@server/models";
import { Event, DocumentEvent, UserEvent } from "@server/types";
import parseMentions from "@server/utils/parseMentions";
import BaseProcessor from "./BaseProcessor";

export default class MentionsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "documents.update",
    "documents.delete",
    "users.delete",
  ];

  async perform(event: DocumentEvent | UserEvent) {
    switch (event.name) {
      case "documents.publish": {
        const document = await Document.findByPk(event.documentId);
        if (!document) {
          return;
        }

        const mentionIds = parseMentions(document.text);
        const findOrCreateMention = async (mentionId: string) => {
          try {
            // check if the mentioned entity exists
            const mentionedUser = await User.findByPk(mentionId);
            if (mentionedUser) {
              await Mention.findOrCreate({
                where: {
                  mentionUserId: mentionId,
                  documentId: event.documentId,
                },
                defaults: {
                  userId: document.lastModifiedById,
                },
              });
            } else {
              // remove the mention
              await Mention.destroy({
                where: {
                  mentionUserId: mentionId,
                  documentId: event.documentId,
                },
              });
            }
          } catch (err) {
            Logger.warn(`MentionsProcessor: ${err.message}`, {
              processor: "MentionsProcessor",
              event,
              err,
            });
          }
        };
        await Promise.allSettled(mentionIds.map(findOrCreateMention));

        break;
      }

      case "documents.update": {
        const document = await Document.findByPk(event.documentId);
        if (!(document && document.publishedAt)) {
          return;
        }
        const mentionIds = parseMentions(document.text);
        const actualMentionIds: string[] = [];
        const findOrCreateMention = async (mentionId: string) => {
          try {
            // check if the mentioned entity exists
            const mentionedUser = await User.findByPk(mentionId);
            if (mentionedUser) {
              await Mention.findOrCreate({
                where: {
                  mentionUserId: mentionId,
                  documentId: event.documentId,
                },
                defaults: {
                  userId: document.lastModifiedById,
                },
              });
              actualMentionIds.push(mentionId);
            } else {
              // remove the mention
              await Mention.destroy({
                where: {
                  mentionUserId: mentionId,
                  documentId: event.documentId,
                },
              });
            }
          } catch (err) {
            Logger.warn(`MentionsProcessor: ${err.message}`, {
              processor: "MentionsProcessor",
              event,
              err,
            });
          }
        };
        await Promise.allSettled(mentionIds.map(findOrCreateMention));

        Mention.destroy({
          where: {
            mentionUserId: {
              [Op.notIn]: actualMentionIds,
            },
            documentId: event.documentId,
          },
        });

        break;
      }

      case "documents.delete": {
        Mention.destroy({
          where: {
            documentId: event.documentId,
          },
        });
        break;
      }

      case "users.delete": {
        try {
          await Promise.all([
            // remove records where this user is mentioned
            Mention.destroy({
              where: {
                mentionUserId: event.userId,
              },
            }),

            // update records where this user mentioned someone
            Mention.update(
              {
                userId: null,
              },
              {
                where: {
                  userId: event.userId,
                },
              }
            ),
          ]);
        } catch (err) {
          Logger.warn(`MentionsProcessor: ${err.message}`, {
            processor: "MentionsProcessor",
            event,
            err,
          });
        }

        break;
      }

      default:
    }
  }
}
