import { UserPasskey, User, Team } from "@server/models";
import type { Event, UserPasskeyEvent } from "@server/types";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import { PasskeyCreatedEmail } from "../email/templates/PasskeyCreatedEmail";

export class PasskeyCreatedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["passkeys.create"];

  async perform(event: UserPasskeyEvent) {
    const userPasskey = await UserPasskey.findByPk(event.modelId, {
      rejectOnEmpty: true,
    });

    const user = await User.findByPk(event.userId);
    if (!user) {
      return;
    }

    const team = await Team.findByPk(user.teamId);
    if (!team) {
      return;
    }

    await new PasskeyCreatedEmail({
      to: user.email,
      userId: user.id,
      passkeyId: userPasskey.id,
      passkeyName: userPasskey.name,
      teamUrl: team.url,
    }).schedule();
  }
}
