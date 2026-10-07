import EmailUpdatedEmail from "@server/emails/templates/EmailUpdatedEmail";
import { User } from "@server/models";
import type { Event as TEvent, UserEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UserUpdatedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["users.update"];

  async perform(event: UserEvent) {
    const previous = event.changes?.previous.email;
    const email = event.changes?.attributes.email;

    // Notify the previous address so the owner can react to an unexpected change.
    if (!previous || !email || previous === email) {
      return;
    }

    const user = await User.scope("withTeam").findByPk(event.userId, {
      paranoid: false,
    });
    if (!user) {
      return;
    }

    await new EmailUpdatedEmail({
      to: previous,
      language: user.language,
      email,
      teamName: user.team.name,
      teamUrl: user.team.url,
    }).schedule();
  }
}
