import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import { Team, User } from "@server/models";
import type { Event, UserEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UserCreatedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "users.create",
    "users.invite_accepted",
  ];

  async perform(event: UserEvent) {
    const [user, team] = await Promise.all([
      User.findByPk(event.userId),
      Team.findByPk(event.teamId),
    ]);

    // The user or team may have been deleted before this event is processed.
    if (!user || !team) {
      return;
    }

    // Invited users receive an InviteEmail at invite time, and a WelcomeEmail
    // when they accept the invite and sign in for the first time.
    if (event.name === "users.create" && user.isInvited) {
      return;
    }

    await new WelcomeEmail({
      to: user.email,
      language: user.language,
      role: user.role,
      teamUrl: team.url,
    }).schedule();
  }
}
