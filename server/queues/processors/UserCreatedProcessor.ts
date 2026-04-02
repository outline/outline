import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import { Team, User } from "@server/models";
import type { Event, UserEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UserCreatedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["users.create"];

  async perform(event: UserEvent) {
    const user = await User.findByPk(event.userId, { rejectOnEmpty: true });

    // Invited users receive an InviteEmail instead.
    if (user.isInvited) {
      return;
    }

    const team = await Team.findByPk(event.teamId, { rejectOnEmpty: true });

    await new WelcomeEmail({
      to: user.email,
      language: user.language,
      role: user.role,
      teamUrl: team.url,
    }).schedule();
  }
}
