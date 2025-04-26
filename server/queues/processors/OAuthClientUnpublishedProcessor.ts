import { Op } from "sequelize";
import { OAuthAuthentication, OAuthClient, User } from "@server/models";
import { OAuthClientEvent, Event as TEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class OAuthClientUnpublishedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["oauthClients.update"];

  async perform(event: OAuthClientEvent) {
    if (
      event.changes?.previous.published === true &&
      event.changes.attributes.published === false
    ) {
      const oauthClient = await OAuthClient.findByPk(event.modelId, {
        rejectOnEmpty: true,
      });
      const users = await User.findAll({
        attributes: ["id"],
        where: {
          teamId: oauthClient.teamId,
        },
      });
      const userIds = users.map((user) => user.id);

      // Revoke access for all users except any that are in the same team
      await OAuthAuthentication.destroy({
        where: {
          oauthClientId: event.modelId,
          userId: {
            [Op.notIn]: userIds,
          },
        },
      });
    }
  }
}
