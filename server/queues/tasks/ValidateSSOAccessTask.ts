import { sequelize } from "@server/database/sequelize";
import Logger from "@server/logging/Logger";
import { User, UserAuthentication } from "@server/models";
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

      // Check the validity of all the user's associated authentications.
      // @ts-expect-error TODO: Need to setup nested tsconfig with ES2021
      const valid = await Promise.any(
        userAuthentications.map(async (authentication) =>
          authentication.validateAccess({ transaction })
        )
      );

      // If any are valid then we're done here.
      if (valid) {
        return;
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
