import { Team, User } from "@server/models";
import { Event, TeamEvent, UserEvent } from "@server/types";
import UploadTeamAvatarTask from "../tasks/UploadTeamAvatarTask";
import UploadUserAvatarTask from "../tasks/UploadUserAvatarTask";
import BaseProcessor from "./BaseProcessor";

export default class AvatarProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["users.create", "teams.create"];

  async perform(event: UserEvent | TeamEvent) {
    // The uploads are performed in a separate task to allow for retrying in the
    // case of failures as it involves network calls to third party services.

    if (event.name === "users.create") {
      const user = await User.findByPk(event.userId, {
        rejectOnEmpty: true,
      });

      if (user.avatarUrl) {
        await new UploadUserAvatarTask().schedule({
          userId: event.userId,
          avatarUrl: user.avatarUrl,
        });
      }
    }

    if (event.name === "teams.create") {
      const team = await Team.findByPk(event.teamId, {
        rejectOnEmpty: true,
      });

      if (team.avatarUrl) {
        await new UploadTeamAvatarTask().schedule({
          teamId: event.teamId,
          avatarUrl: team.avatarUrl,
        });
      }
    }
  }
}
