import { Op, Sequelize } from "sequelize";
import Logger from "@server/logging/Logger";
import {
  OAuthAuthentication,
  OAuthAuthorizationCode,
  OAuthClient,
} from "@server/models";
import { sequelize } from "@server/storage/database";
import { BaseTask } from "./base/BaseTask";

type Props = {
  teamId: string;
};

/**
 * Task to revoke the outstanding authorization codes and access tokens held by
 * dynamically registered OAuth clients in a team, and by metadata document
 * clients for users of the team.
 */
export default class RevokeDynamicOAuthClientsTask extends BaseTask<Props> {
  protected jobId({ teamId }: Props) {
    return `revoke-dynamic-oauth-clients:${teamId}`;
  }

  public async perform({ teamId }: Props) {
    const clients = await OAuthClient.findAll({
      attributes: ["id"],
      where: {
        teamId,
        createdById: null,
      },
    });

    // Metadata document clients are shared by all teams, so only the grants
    // held by users of this team are revoked.
    const where = {
      [Op.or]: [
        { oauthClientId: clients.map((client) => client.id) },
        {
          oauthClientId: {
            [Op.in]: Sequelize.literal(
              `(SELECT id FROM oauth_clients WHERE "teamId" IS NULL)`
            ),
          },
          userId: {
            [Op.in]: Sequelize.literal(
              `(SELECT id FROM users WHERE "teamId" = ${sequelize.escape(teamId)})`
            ),
          },
        },
      ],
    };

    const count = await sequelize.transaction(async (transaction) => {
      const authentications = await OAuthAuthentication.destroy({
        where,
        transaction,
      });
      const codes = await OAuthAuthorizationCode.destroy({
        where,
        transaction,
      });
      return authentications + codes;
    });

    if (count > 0) {
      Logger.info(
        "task",
        `Revoked ${count} grants held by dynamic OAuth clients in team ${teamId}`
      );
    }
  }
}
