import { subDays } from "date-fns";
import { Op } from "sequelize";
import InviteReminderEmail from "@server/emails/templates/InviteReminderEmail";
import { User } from "@server/models";
import { UserFlag } from "@server/models/User";
import { sequelize } from "@server/storage/database";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";

type Props = Record<string, never>;

export default class InviteReminderTask extends BaseTask<Props> {
  static cron = TaskSchedule.Day;

  public async perform() {
    const users = await User.scope("invited").findAll({
      attributes: ["id"],
      where: {
        createdAt: {
          [Op.lt]: subDays(new Date(), 2),
          [Op.gt]: subDays(new Date(), 3),
        },
      },
    });
    const userIds = users.map((user) => user.id);

    for (const userId of userIds) {
      await sequelize.transaction(async (transaction) => {
        const user = await User.scope("withTeam").findByPk(userId, {
          lock: {
            level: transaction.LOCK.UPDATE,
            of: User,
          },
          transaction,
        });

        const invitedBy = user?.invitedById
          ? await User.findByPk(user?.invitedById, { transaction })
          : undefined;

        if (
          user &&
          invitedBy &&
          user.getFlag(UserFlag.InviteReminderSent) === 0
        ) {
          await new InviteReminderEmail({
            to: user.email,
            name: user.name,
            actorName: invitedBy.name,
            actorEmail: invitedBy.email,
            teamName: user.team.name,
            teamUrl: user.team.url,
          }).schedule();

          user.incrementFlag(UserFlag.InviteReminderSent);
          await user.save({ transaction });
        }
      });
    }
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
