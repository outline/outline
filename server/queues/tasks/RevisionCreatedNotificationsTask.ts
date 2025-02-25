import { subHours } from "date-fns";
import differenceBy from "lodash/differenceBy";
import { Op } from "sequelize";
import { MentionType, NotificationEventType } from "@shared/types";
import { createSubscriptionsForDocument } from "@server/commands/subscriptionCreator";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { Document, Revision, Notification, User, View } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { RevisionEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class RevisionCreatedNotificationsTask extends BaseTask<RevisionEvent> {
  public async perform(event: RevisionEvent) {
    const [document, revision] = await Promise.all([
      Document.findByPk(event.documentId, { includeState: true }),
      Revision.findByPk(event.modelId),
    ]);

    if (!document || !revision) {
      return;
    }

    await createSubscriptionsForDocument(document, event);

    const before = await revision.before();

    // If the content looks the same, don't send notifications
    if (!DocumentHelper.isChangeOverThreshold(before, revision, 5)) {
      Logger.info(
        "processor",
        `suppressing notifications as update has insignificant changes`
      );
      return;
    }

    // Send notifications to mentioned users first
    const oldMentions = before
      ? DocumentHelper.parseMentions(before, { type: MentionType.User })
      : [];
    const newMentions = DocumentHelper.parseMentions(document, {
      type: MentionType.User,
    });
    const mentions = differenceBy(newMentions, oldMentions, "id");
    const userIdsMentioned: string[] = [];

    for (const mention of mentions) {
      if (userIdsMentioned.includes(mention.modelId)) {
        continue;
      }

      const recipient = await User.findByPk(mention.modelId);
      if (
        recipient &&
        recipient.id !== mention.actorId &&
        recipient.subscribedToEventType(
          NotificationEventType.MentionedInDocument
        ) &&
        (await canUserAccessDocument(recipient, document.id))
      ) {
        await Notification.create({
          event: NotificationEventType.MentionedInDocument,
          userId: recipient.id,
          revisionId: event.modelId,
          actorId: mention.actorId,
          teamId: document.teamId,
          documentId: document.id,
        });
        userIdsMentioned.push(recipient.id);
      }
    }

    const recipients = (
      await NotificationHelper.getDocumentNotificationRecipients({
        document,
        notificationType: NotificationEventType.UpdateDocument,
        onlySubscribers: true,
        actorId: document.lastModifiedById,
      })
    ).filter((recipient) => !userIdsMentioned.includes(recipient.id));
    if (!recipients.length) {
      return;
    }

    for (const recipient of recipients) {
      const notify = await this.shouldNotify(document, recipient);

      if (notify) {
        await Notification.create({
          event: NotificationEventType.UpdateDocument,
          userId: recipient.id,
          revisionId: event.modelId,
          actorId: document.updatedBy.id,
          teamId: document.teamId,
          documentId: document.id,
        });
      }
    }
  }

  private shouldNotify = async (
    document: Document,
    user: User
  ): Promise<boolean> => {
    // Create only a single notification in a 6 hour window
    const notification = await Notification.findOne({
      order: [["createdAt", "DESC"]],
      where: {
        userId: user.id,
        documentId: document.id,
        emailedAt: {
          [Op.not]: null,
          [Op.gte]: subHours(new Date(), 6),
        },
      },
    });

    if (notification) {
      if (env.isDevelopment) {
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
