import Logger from "@server/logging/Logger";
import { User, UserAuthentication } from "@server/models";
import { MutexLock } from "@server/utils/MutexLock";
import { Minute } from "@shared/utils/time";
import SyncUserGroupsTask from "./SyncUserGroupsTask";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type Props = {
  userId: string;
};

export default class ValidateSSOAccessTask extends BaseTask<Props> {
  protected jobId({ userId }: Props) {
    return `validate-sso:${userId}`;
  }

  public async perform({ userId }: Props) {
    await MutexLock.using(
      `validateSSO:${userId}`,
      Minute.ms,
      async (signal) => {
        const userAuthentications = await UserAuthentication.findAll({
          where: { userId },
        });
        if (userAuthentications.length === 0) {
          return;
        }

        // Check the validity of the user's authentications. Validation is
        // throttled internally, so we track whether a fresh validation with
        // the provider actually occurred to avoid syncing groups too often.
        let error;
        const freshlyValidated: UserAuthentication[] = [];
        const validity = await Promise.all(
          userAuthentications.map(async (authentication) => {
            const previouslyValidatedAt = authentication.lastValidatedAt;
            try {
              const isValid = await authentication.validateAccess();
              if (
                isValid &&
                authentication.lastValidatedAt > previouslyValidatedAt
              ) {
                freshlyValidated.push(authentication);
              }
              return isValid;
            } catch (err) {
              error = err;
              return false;
            }
          })
        );

        if (signal.aborted) {
          throw signal.error;
        }

        if (validity.some((isValid) => isValid)) {
          // Re-sync group memberships from each provider that was just
          // validated with the third party.
          for (const authentication of freshlyValidated) {
            await new SyncUserGroupsTask().schedule({
              userAuthenticationId: authentication.id,
            });
          }
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
      }
    );
  }

  public get options() {
    return {
      attempts: 2,
      priority: TaskPriority.Background,
    };
  }
}
