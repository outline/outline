import { Op } from "sequelize";
import { TeamPreference, UserRole } from "@shared/types";
import Logger from "@server/logging/Logger";
import { ApiKey, User } from "@server/models";
import { Event, TeamEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class ApiKeyCleanupProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["teams.update"];

  async perform(event: TeamEvent) {
    // If the team preference to allow members to create API keys has been disabled, we need to
    // clean up any existing API keys created by non-admins as they are no longer valid.
    if (
      event.changes?.attributes.preferences?.[
        TeamPreference.MembersCanCreateApiKey
      ] === false
    ) {
      const userIds = (
        await User.findAll({
          attributes: ["id"],
          where: {
            teamId: event.teamId,
            role: {
              [Op.ne]: UserRole.Admin,
            },
          },
        })
      ).map((u) => u.id);

      const count = await ApiKey.destroy({
        where: {
          userId: userIds,
        },
      });

      Logger.info(
        "processor",
        `Deleted ${count} API keys for non-admin users in team ${event.teamId}`
      );
    }
  }
}
