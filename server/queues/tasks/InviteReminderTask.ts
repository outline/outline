import { subDays } from "date-fns";
import { Op } from "sequelize";
import { sequelize } from "@server/database/sequelize";
import InviteEmail from "@server/emails/templates/InviteEmail";
import { APM } from "@server/logging/tracing";
import { User } from "@server/models";
import { UserFlag } from "@server/models/User";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = undefined;

@APM.trace()
export default class InviteReminderTask extends BaseTask<Props> {
  public async perform() {
    return sequelize.transaction(async (transaction) => {
      const users = await User.scope([
        "invited",
        "withInvitedBy",
        "withTeam",
      ]).findAll({
        lock: transaction.LOCK.UPDATE,
        where: {
          createdAt: {
            [Op.lt]: subDays(new Date(), 2),
            [Op.gt]: subDays(new Date(), 3),
          },
        },
        transaction,
      });

      for (const user of users) {
        if (user.getFlag(UserFlag.InviteReminderSent) === 0 && user.invitedBy) {
          user.incrementFlag(UserFlag.InviteReminderSent);
          await user.save({ transaction });

          await InviteEmail.schedule({
            to: user.email,
            name: user.name,
            actorName: user.invitedBy.name,
            actorEmail: user.invitedBy.email,
            teamName: user.team.name,
            teamUrl: user.team.url,
          });
        }
      }
    });
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
