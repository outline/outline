import { subDays, subHours } from "date-fns";
import type { WhereOptions } from "sequelize";
import { Op, Sequelize } from "sequelize";
import { OAuthClientValidation } from "@shared/validations";
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

    const metadataDocumentPattern = `${OAuthClientValidation.metadataDocumentClientIdPrefix}%`;

    const count = await this.destroyClients(
      {
        createdById: null,
        clientId: { [Op.notLike]: metadataDocumentPattern },
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
      limit
    );

    const metadataCount = await this.destroyClients(
      {
        clientId: { [Op.like]: metadataDocumentPattern },
        createdAt: { [Op.lt]: neverUsedCutoff },
        [Op.and]: [
          Sequelize.literal(
            `NOT EXISTS (SELECT 1 FROM oauth_authentications oa WHERE oa."oauthClientId" = "oauth_client"."id" AND oa."deletedAt" IS NULL AND (oa."accessTokenExpiresAt" > NOW() OR oa."refreshTokenExpiresAt" > NOW()))`
          ),
        ],
      },
      limit
    );

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

  /**
   * Permanently delete up to a limit of matching clients. Each client runs
   * its destroy hooks, which delete logos that are no longer used.
   *
   * @param where The clients to delete.
   * @param limit The maximum number of clients to delete.
   * @returns The number of clients deleted.
   */
  private async destroyClients(
    where: WhereOptions<OAuthClient>,
    limit: number
  ) {
    const clients = await OAuthClient.unscoped().findAll({
      attributes: ["id"],
      where,
      limit,
      paranoid: false,
    });
    if (clients.length === 0) {
      return 0;
    }

    return OAuthClient.unscoped().destroy({
      where: { id: clients.map((client) => client.id) },
      individualHooks: true,
      force: true,
    });
  }
}
