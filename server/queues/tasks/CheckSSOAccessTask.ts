import { sequelize } from "@server/database/sequelize";
import Logger from "@server/logging/Logger";
import { User, UserAuthentication } from "@server/models";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  userId: string;
};

export default class CheckSSOAccessTask extends BaseTask<Props> {
  public async perform({ userId }: Props) {
    await sequelize.transaction(async (transaction) => {
      const userAuthentications = await UserAuthentication.findAll({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      for (const authentication of userAuthentications) {
        const ok = await authentication.validateAccess({ transaction });
        if (!ok) {
          const user = await User.findByPk(userId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          Logger.info(
            "task",
            `Authentication token no longer valid for ${user?.id}`
          );
          if (user) {
            User.setRandomJwtSecret(user);
            await user.save({ transaction });
          }
          break;
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
