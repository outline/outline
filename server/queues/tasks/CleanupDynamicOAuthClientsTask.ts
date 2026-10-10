import { subDays, subHours } from "date-fns";
import { Op, Sequelize } from "sequelize";
import Logger from "@server/logging/Logger";
import { OAuthClient } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Deletes dynamically registered OAuth clients (createdById is null) that are
 * either never used (lastActiveAt is null) after 48 hours, or that have been
 * used but inactive for 30 days.
 *
 * Clients identified by a metadata document are only deleted when no user
 * holds a token for them, as the document is fetched again on next use.
 */
export default class CleanupDynamicOAuthClientsTask extends CronTask {
  public async perform({ limit }: Props) {
    const now = new Date();
    const neverUsedCutoff = subHours(now, 48);
    const inactiveCutoff = subDays(now, 30);

    const count = await OAuthClient.unscoped().destroy({
      where: {
        createdById: null,
        clientId: { [Op.notLike]: "https://%" },
        [Op.or]: [
          {
            // Never used and created more than 48 hours ago.
            lastActiveAt: null,
            createdAt: { [Op.lt]: neverUsedCutoff },
          },
          {
            // Used but inactive for more than 30 days.
            lastActiveAt: { [Op.lt]: inactiveCutoff },
          },
        ],
      },
      limit,
      force: true,
    });

    const metadataCount = await OAuthClient.unscoped().destroy({
      where: {
        createdById: null,
        teamId: null,
        clientId: { [Op.like]: "https://%" },
        createdAt: { [Op.lt]: neverUsedCutoff },
        [Op.and]: [
          Sequelize.literal(
            `NOT EXISTS (SELECT 1 FROM oauth_authentications oa WHERE oa."oauthClientId" = "oauth_clients"."id" AND oa."deletedAt" IS NULL)`
          ),
        ],
      },
      limit,
      force: true,
    });

    if (count > 0 || metadataCount > 0) {
      Logger.info("task", `Deleted dynamic OAuth clients`, {
        count,
        metadataCount,
      });
    }
  }

  public get cron() {
    return {
      interval: TaskInterval.Day,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
