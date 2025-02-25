import { NotificationEventType } from "@shared/types";
import InviteAcceptedEmail from "@server/emails/templates/InviteAcceptedEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import { User } from "@server/models";
import { Event as TEvent, UserEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UserSigninProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["users.signin"];

  async perform(event: UserEvent) {
    const inviteAccepted =
      "data" in event &&
      "inviteAccepted" in event.data &&
      event.data.inviteAccepted === true;
    if (!inviteAccepted) {
      return;
    }

    const user = await User.scope("withTeam").findByPk(event.userId, {
      rejectOnEmpty: true,
    });

    await new WelcomeEmail({
      to: user.email,
      role: user.role,
      teamUrl: user.team.url,
    }).schedule();

    const inviter = await user.$get("invitedBy");
    if (inviter?.subscribedToEventType(NotificationEventType.InviteAccepted)) {
      await new InviteAcceptedEmail({
        to: inviter.email,
        inviterId: inviter.id,
        invitedName: user.name,
        teamUrl: user.team.url,
      }).schedule();
    }
  }
}
