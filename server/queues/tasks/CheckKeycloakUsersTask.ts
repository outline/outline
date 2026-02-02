import { subMonths } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { AuthenticationProvider, User, UserAuthentication } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import OIDCClient from "plugins/oidc/server/oidc";
import env from "plugins/oidc/server/env";

type Props = {
  limit: number;
  partition: { partitionIndex: number; partitionCount: number };
};

/**
 * Task that checks Keycloak/OIDC users who haven't logged in for 6+ months
 * to verify if they're still active in Keycloak. Inactive users can be
 * marked for cleanup.
 *
 * Runs daily but only processes users who haven't logged in for 6+ months.
 */
export default class CheckKeycloakUsersTask extends CronTask {
  public async perform({ limit, partition }: Props) {
    const sixMonthsAgo = subMonths(new Date(), 6);

    Logger.info(
      "task",
      `Checking Keycloak users inactive for 6+ months (since ${sixMonthsAgo.toISOString()})…`
    );

    // Find all OIDC authentication providers
    const oidcProviders = await AuthenticationProvider.findAll({
      where: {
        name: "oidc",
        enabled: true,
      },
    });

    if (oidcProviders.length === 0) {
      Logger.debug("task", "No OIDC providers found, skipping check");
      return;
    }

    const providerIds = oidcProviders.map((p) => p.id);

    // Find users with OIDC authentication who haven't logged in for 6+ months
    const partitionWhere = this.getPartitionWhereClause("id", partition);

    const users = await User.findAll({
      where: {
        ...partitionWhere,
        lastActiveAt: {
          [Op.or]: [
            { [Op.lt]: sixMonthsAgo },
            { [Op.is]: null },
          ],
        },
      },
      include: [
        {
          model: UserAuthentication,
          as: "authentications",
          required: true,
          where: {
            authenticationProviderId: {
              [Op.in]: providerIds,
            },
          },
          include: [
            {
              model: AuthenticationProvider,
              as: "authenticationProvider",
              required: true,
            },
          ],
        },
      ],
      limit,
    });

    Logger.info("task", `Found ${users.length} OIDC users to check`);

    if (!env.OIDC_USERINFO_URI || !env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET) {
      Logger.warn(
        "task",
        "OIDC not fully configured (missing OIDC_USERINFO_URI, OIDC_CLIENT_ID, or OIDC_CLIENT_SECRET), cannot check user status"
      );
      return;
    }

    let oidcClient: OIDCClient;
    try {
      oidcClient = new OIDCClient();
    } catch (err) {
      Logger.warn(
        "task",
        "Failed to initialize OIDC client",
        err instanceof Error ? err : new Error(String(err))
      );
      return;
    }
    let checked = 0;
    let inactive = 0;
    let errors = 0;

    for (const user of users) {
      try {
        checked++;

        // Get the OIDC authentication for this user
        const oidcAuth = user.authentications.find(
          (auth) => auth.authenticationProvider.name === "oidc"
        );

        if (!oidcAuth || !oidcAuth.accessToken) {
          Logger.debug(
            "task",
            `User ${user.id} has no OIDC access token, skipping`,
            { userId: user.id, email: user.email }
          );
          continue;
        }

        // Try to refresh the token if needed
        try {
          await oidcAuth.refreshAccessTokenIfNeeded(
            oidcAuth.authenticationProvider,
            {}
          );
        } catch (refreshErr) {
          Logger.debug(
            "task",
            `Failed to refresh token for user ${user.id}`,
            {
              userId: user.id,
              email: user.email,
              error: refreshErr,
            }
          );
        }

        // Check user status via userinfo endpoint
        try {
          const userInfo = await oidcClient.userInfo(oidcAuth.accessToken);

          if (!userInfo || !userInfo.sub) {
            // User not found or invalid response
            Logger.info(
              "task",
              `User ${user.id} not found in Keycloak or invalid response`,
              {
                userId: user.id,
                email: user.email,
                lastActiveAt: user.lastActiveAt,
              }
            );
            inactive++;
            // Optionally mark user as inactive or delete
            // await user.update({ suspendedAt: new Date() });
            continue;
          }

          // User is active in Keycloak
          Logger.debug(
            "task",
            `User ${user.id} is still active in Keycloak`,
            {
              userId: user.id,
              email: user.email,
              sub: userInfo.sub,
            }
          );
        } catch (userInfoErr: any) {
          // OAuthClient.userInfo throws AuthenticationError on non-2xx responses
          // This typically means the token is invalid or user is inactive
          const errorMessage = userInfoErr?.message || String(userInfoErr);
          
          Logger.info(
            "task",
            `User ${user.id} appears inactive in Keycloak (${errorMessage})`,
            {
              userId: user.id,
              email: user.email,
              lastActiveAt: user.lastActiveAt,
              error: errorMessage,
            }
          );
          inactive++;
          // Optionally mark user as inactive or delete
          // await user.update({ suspendedAt: new Date() });
        }
      } catch (err) {
        Logger.error(
          "task",
          `Unexpected error checking user ${user.id}`,
          err instanceof Error ? err : new Error(String(err)),
          {
            userId: user.id,
            email: user.email,
          }
        );
        errors++;
      }
    }

    Logger.info("task", `Keycloak user check complete`, {
      checked,
      inactive,
      errors,
      total: users.length,
    });
  }

  public get cron() {
    return {
      interval: TaskInterval.Day,
    };
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Background,
    };
  }
}
