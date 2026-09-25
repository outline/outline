import type { JobOptions } from "bull";
import groupsSyncer from "@server/commands/groupsSyncer";
import { createContext } from "@server/context";
import Logger from "@server/logging/Logger";
import {
  AuthenticationProvider,
  Team,
  User,
  UserAuthentication,
} from "@server/models";
import { sequelize } from "@server/storage/database";
import { PluginManager } from "@server/utils/PluginManager";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type Props = {
  /** The user authentication record holding the provider access token. */
  userAuthenticationId: string;
};

/**
 * Fetches a user's group memberships from the authentication provider linked
 * to the given user authentication and synchronizes them with internal
 * groups. This is a no-op when group sync is not enabled for the provider,
 * no access token is stored, or the provider plugin does not support group
 * sync.
 */
export default class SyncUserGroupsTask extends BaseTask<Props> {
  /**
   * Schedules the task with a job id derived from the user authentication so
   * that only one sync per authentication is queued at a time.
   *
   * @param props Properties to be used by the task
   * @param options Job options such as priority and retry strategy, as defined by Bull.
   * @returns A promise that resolves once the job is placed on the task queue
   */
  public schedule(props: Props, options?: JobOptions) {
    return super.schedule(props, {
      ...options,
      jobId: `sync-user-groups:${props.userAuthenticationId}`,
    });
  }

  public async perform({ userAuthenticationId }: Props) {
    const authentication = await UserAuthentication.findByPk(
      userAuthenticationId,
      {
        include: [
          {
            model: AuthenticationProvider,
            as: "authenticationProvider",
            required: true,
          },
          {
            model: User,
            as: "user",
            required: true,
          },
        ],
      }
    );
    if (!authentication || !authentication.accessToken) {
      return;
    }

    const { user, authenticationProvider, accessToken } = authentication;
    if (user.isSuspended) {
      return;
    }

    const settings = authenticationProvider.settings;
    if (!settings?.groupSyncEnabled) {
      return;
    }

    const syncProvider = PluginManager.getGroupSyncProvider(
      authenticationProvider.name
    );
    if (!syncProvider) {
      return;
    }

    const team = await Team.findByPk(user.teamId);
    if (!team) {
      return;
    }

    const externalGroups = await syncProvider.fetchUserGroups(
      accessToken,
      settings
    );

    await sequelize.transaction(async (transaction) => {
      const ctx = createContext({ user, transaction });

      await groupsSyncer(ctx, {
        user,
        team,
        authenticationProvider,
        externalGroups,
      });
    });

    Logger.info("task", "Group sync completed", {
      userId: user.id,
      provider: authenticationProvider.name,
    });
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Background,
    };
  }
}
