import { subHours } from "date-fns";
import { differenceBy } from "lodash";
import { Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import { createSubscriptionsForDocument } from "@server/commands/subscriptionCreator";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  Collection,
  Document,
  Revision,
  Notification,
  Team,
  User,
  View,
} from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { RevisionEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class RevisionCreatedNotificationTask extends BaseTask<
  RevisionEvent
> {
  public async perform(event: RevisionEvent) {
    const [collection, document, revision, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId, { includeState: true }),
      Revision.findByPk(event.modelId),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !revision || !collection) {
      return;
    }

    await createSubscriptionsForDocument(document, event);

    // Send notifications to mentioned users first
    const prev = await revision.previous();
    const oldMentions = prev ? DocumentHelper.parseMentions(prev) : [];
    const newMentions = DocumentHelper.parseMentions(document);
    const mentions = differenceBy(newMentions, oldMentions, "id");
    const userIdsMentioned: string[] = [];

    for (const mention of mentions) {
      const [recipient, actor] = await Promise.all([
        User.findByPk(mention.modelId),
        User.findByPk(mention.actorId),
      ]);
      if (
        recipient &&
        actor &&
        recipient.id !== actor.id &&
        recipient.subscribedToEventType(NotificationEventType.Mentioned)
      ) {
        await Notification.create({
          event: event.name,
          userId: recipient.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });
        userIdsMentioned.push(recipient.id);
        // await new DocumentMentionedEmail(
        //   {
        //     to: recipient.email,
        //     documentId: event.documentId,
        //     actorName: actor.name,
        //     teamUrl: team.url,
        //     mentionId: mention.id,
        //   },
        //   { notificationId: notification.id }
        // ).schedule();
      }
    }

    const recipients = (
      await NotificationHelper.getDocumentNotificationRecipients(
        document,
        NotificationEventType.UpdateDocument,
        document.lastModifiedById,
        true
      )
    ).filter((recipient) => !userIdsMentioned.includes(recipient.id));
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
        await Notification.create({
          event: event.name,
          userId: recipient.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });

        // await new DocumentPublishedOrUpdatedEmail(
        //   {
        //     to: recipient.email,
        //     userId: recipient.id,
        //     eventType: NotificationEventType.UpdateDocument,
        //     documentId: document.id,
        //     teamUrl: team.url,
        //     actorName: document.updatedBy.name,
        //     collectionName: collection.name,
        //     content,
        //   },
        //   { notificationId: notification.id }
        // ).schedule();
      }
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

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
