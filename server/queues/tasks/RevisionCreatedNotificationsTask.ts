import { subHours } from "date-fns";
import differenceBy from "lodash/differenceBy";
import { Op } from "sequelize";
import { MentionType, NotificationEventType } from "@shared/types";
import { createSubscriptionsForDocument } from "@server/commands/subscriptionCreator";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  Document,
  Group,
  Revision,
  Notification,
  User,
  View,
  GroupUser,
} from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import type { RevisionEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";

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

    // Send notifications to mentioned users first – these must be processed
    // regardless of the change threshold as even a small edit can add a mention.
    const oldMentions = before
      ? [...DocumentHelper.parseMentions(before, { type: MentionType.User })]
      : [];
    const newMentions = [
      ...DocumentHelper.parseMentions(document, {
        type: MentionType.User,
      }),
    ];

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

    // Send notifications to users in mentioned groups
    const oldGroupMentions = before
      ? DocumentHelper.parseMentions(before, { type: MentionType.Group })
      : [];
    const newGroupMentions = DocumentHelper.parseMentions(document, {
      type: MentionType.Group,
    });

    const groupMentions = differenceBy(
      newGroupMentions,
      oldGroupMentions,
      "id"
    );
    const mentionedGroup: string[] = [];
    for (const group of groupMentions) {
      if (mentionedGroup.includes(group.modelId)) {
        continue;
      }

      // Check if the group has mentions disabled
      const groupModel = await Group.findByPk(group.modelId);
      if (groupModel?.disableMentions) {
        continue;
      }

      const usersFromMentionedGroup = await GroupUser.findAll({
        where: {
          groupId: group.modelId,
        },
        order: [["permission", "ASC"]],
      });

      const mentionedUser: string[] = [];
      for (const user of usersFromMentionedGroup) {
        if (mentionedUser.includes(user.userId)) {
          continue;
        }

        const recipient = await User.findByPk(user.userId);
        if (
          recipient &&
          recipient.id !== group.actorId &&
          recipient.subscribedToEventType(
            NotificationEventType.GroupMentionedInDocument
          ) &&
          (await canUserAccessDocument(recipient, document.id))
        ) {
          await Notification.create({
            event: NotificationEventType.GroupMentionedInDocument,
            groupId: group.modelId,
            userId: recipient.id,
            revisionId: event.modelId,
            actorId: group.actorId,
            teamId: document.teamId,
            documentId: document.id,
          });

          mentionedUser.push(user.userId);
        }
      }

      mentionedGroup.push(group.modelId);
    }

    // If the content change is insignificant, don't send generic update
    // notifications (mention notifications above are still sent).
    if (!DocumentHelper.isChangeOverThreshold(before, revision, 5)) {
      Logger.info(
        "processor",
        `suppressing update notifications as change has insignificant edits`
      );
      return;
    }

    const recipients = (
      await NotificationHelper.getDocumentNotificationRecipients({
        document,
        notificationType: NotificationEventType.UpdateDocument,
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
