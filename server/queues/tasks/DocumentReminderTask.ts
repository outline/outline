import { addDays } from "date-fns";
import { Op } from "sequelize";
import DocumentReminderEmail from "@server/emails/templates/DocumentReminderEmail";
import { Document, DocumentReminder, User } from "@server/models";
import { canUserAccessDocument } from "@server/utils/permissions";
import { sequelize } from "@server/storage/database";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Cron task to send document reminders to editors.
 * Runs daily and checks for reminders that should be sent.
 */
export default class DocumentReminderTask extends CronTask {
  public async perform({ limit, partition }: { limit: number; partition?: { partitionIndex: number; partitionCount: number } }) {
    const now = new Date();
    const partitionWhere = partition
      ? this.getPartitionWhereClause("id", partition)
      : {};

    // Find active reminders that should be sent now
    const reminders = await DocumentReminder.findAll({
      where: {
        isActive: true,
        nextSendAt: {
          [Op.lte]: now,
        },
        ...partitionWhere,
      },
      include: [
        { model: Document, as: "document", required: true },
        { model: User, as: "owner", required: true },
        { model: User, as: "editor", required: true },
      ],
      limit,
      order: [["nextSendAt", "ASC"]],
    });

    for (const reminder of reminders) {
      await sequelize.transaction(async (transaction) => {
        // Reload with lock to prevent concurrent processing
        const lockedReminder = await DocumentReminder.findByPk(reminder.id, {
          lock: {
            level: transaction.LOCK.UPDATE,
            of: DocumentReminder,
          },
          transaction,
          include: [
            { model: Document, as: "document" },
            { model: User, as: "owner" },
            { model: User, as: "editor" },
          ],
        });

        if (!lockedReminder || !lockedReminder.isActive) {
          return;
        }

        // Check if reminder should still be sent
        if (!lockedReminder.nextSendAt || lockedReminder.nextSendAt > now) {
          return;
        }

        const { document, owner, editor } = lockedReminder;

        // Don't send if editor is suspended
        if (editor.isSuspended) {
          lockedReminder.isActive = false;
          await lockedReminder.save({ transaction });
          return;
        }

        // Check if editor has access to the document
        if (!(await canUserAccessDocument(editor, document.id))) {
          lockedReminder.isActive = false;
          await lockedReminder.save({ transaction });
          return;
        }

        // Get team for URL
        const team = await document.$get("team", { transaction });
        if (!team) {
          lockedReminder.isActive = false;
          await lockedReminder.save({ transaction });
          return;
        }

        // Send the reminder email
        await new DocumentReminderEmail({
          to: editor.email,
          userId: editor.id,
          documentId: document.id,
          ownerName: owner.name,
          ownerEmail: owner.email,
          teamUrl: team.url,
          message: lockedReminder.message,
        }).schedule();

        // Update reminder: set lastSentAt and calculate nextSendAt if recurring
        lockedReminder.lastSentAt = now;

        if (lockedReminder.intervalDays) {
          // Recurring reminder: calculate next send date
          lockedReminder.nextSendAt = addDays(now, lockedReminder.intervalDays);
        } else {
          // One-time reminder: deactivate
          lockedReminder.isActive = false;
          lockedReminder.nextSendAt = null;
        }

        await lockedReminder.save({ transaction });
      });
    }
  }

  public get cron() {
    return {
      interval: TaskInterval.Hour,
    };
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Background,
    };
  }
}
