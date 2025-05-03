import { OAuthAuthentication } from "@server/models";
import { Event as TEvent, UserEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class UserSuspendedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["users.suspend"];

  async perform(event: UserEvent) {
    // Remove all OAuth authentications for this user.
    await OAuthAuthentication.destroy({
      where: { userId: event.userId },
    });
  }
}
