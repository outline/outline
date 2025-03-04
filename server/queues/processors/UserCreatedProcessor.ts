import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import { User } from "@server/models";
import { Event as TEvent, UserEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UserCreatedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["users.create"];

  async perform(event: UserEvent) {
    const user = await User.scope("withTeam").findByPk(event.userId, {
      rejectOnEmpty: true,
    });

    if (user.isInvited) {
      return;
    }
    await new WelcomeEmail({
      to: user.email,
      role: user.role,
      teamUrl: user.team.url,
    }).schedule();
  }
}
