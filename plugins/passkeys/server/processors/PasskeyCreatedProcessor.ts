import { UserPasskey, User } from "@server/models";
import type { Event, UserPasskeyEvent } from "@server/types";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import { PasskeyCreatedEmail } from "../email/templates/PasskeyCreatedEmail";

export class PasskeyCreatedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["passkeys.create"];

  async perform(event: UserPasskeyEvent) {
    const userPasskey = await UserPasskey.findByPk(event.modelId);
    if (!userPasskey) {
      return;
    }

    const user = await User.scope("withTeam").findByPk(event.userId);
    if (!user) {
      return;
    }

    await new PasskeyCreatedEmail({
      to: user.email,
      userId: user.id,
      passkeyId: userPasskey.id,
      passkeyName: userPasskey.name,
      teamUrl: user.team.url,
    }).schedule();
  }
}
