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
 * dynamically registered OAuth clients in a team.
 */
export default class RevokeDynamicOAuthClientsTask extends BaseTask<Props> {
  public async perform({ teamId }: Props) {
    const clients = await OAuthClient.findAll({
      attributes: ["id"],
      where: {
        teamId,
        createdById: null,
      },
    });

    if (!clients.length) {
      return;
    }

    const oauthClientIds = clients.map((client) => client.id);

    await sequelize.transaction(async (transaction) => {
      await OAuthAuthentication.destroy({
        where: { oauthClientId: oauthClientIds },
        transaction,
      });
      await OAuthAuthorizationCode.destroy({
        where: { oauthClientId: oauthClientIds },
        transaction,
      });
    });

    Logger.info(
      "task",
      `Revoked access for ${clients.length} dynamic OAuth clients in team ${teamId}`
    );
  }
}
