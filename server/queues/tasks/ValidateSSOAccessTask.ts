import Logger from "@server/logging/Logger";
import { User, UserAuthentication } from "@server/models";
import { sequelize } from "@server/storage/database";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  userId: string;
};

export default class ValidateSSOAccessTask extends BaseTask<Props> {
  public async perform({ userId }: Props) {
    await sequelize.transaction(async (transaction) => {
      const userAuthentications = await UserAuthentication.findAll({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (userAuthentications.length === 0) {
        return;
      }

      // Check the validity of the user's authentications.
      let error;
      const validity = await Promise.all(
        userAuthentications.map(async (authentication) => {
          try {
            return await authentication.validateAccess({ transaction });
          } catch (err) {
            error = err;
            return false;
          }
        })
      );

      if (validity.some((isValid) => isValid)) {
        return;
      }

      // If an unexpected error occurred, throw it to trigger a retry.
      if (error) {
        throw error;
      }

      // If all are invalid then we need to revoke the users Outline sessions.
      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      Logger.info(
        "task",
        `Authentication token no longer valid for ${user?.id}`
      );

      await user?.rotateJwtSecret({ transaction });
    });
  }

  public get options() {
    return {
      attempts: 2,
      priority: TaskPriority.Background,
    };
  }
}
