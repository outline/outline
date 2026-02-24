import Logger from "@server/logging/Logger";
import { User, UserAuthentication } from "@server/models";
import { MutexLock } from "@server/utils/MutexLock";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type Props = {
  userId: string;
};

export default class ValidateSSOAccessTask extends BaseTask<Props> {
  public async perform({ userId }: Props) {
    const lock = await MutexLock.acquire(`validateSSO:${userId}`, 60000);

    try {
      const userAuthentications = await UserAuthentication.findAll({
        where: { userId },
      });
      if (userAuthentications.length === 0) {
        return;
      }

      // Check the validity of the user's authentications.
      let error;
      const validity = await Promise.all(
        userAuthentications.map(async (authentication) => {
          try {
            return await authentication.validateAccess();
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
      const user = await User.findByPk(userId);

      Logger.info(
        "task",
        `Authentication token no longer valid for ${user?.id}`
      );

      await user?.rotateJwtSecret({});
    } finally {
      await MutexLock.release(lock);
    }
  }

  public get options() {
    return {
      attempts: 2,
      priority: TaskPriority.Background,
    };
  }
}
