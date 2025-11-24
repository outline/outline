import { User } from "@server/models";
import { UserEvent } from "@server/types";
import UploadUserAvatarTask from "../tasks/UploadUserAvatarTask";
import BaseProcessor from "./BaseProcessor";

/**
 * Processor to handle avatar synchronization on user signin events.
 * This checks if the user's avatar from their identity provider has changed
 * and updates it if necessary, unless the user has manually changed their avatar.
 */
export default class AvatarSyncProcessor extends BaseProcessor {
  static applicableEvents: UserEvent["name"][] = ["users.signin"];

  async perform(event: UserEvent) {
    switch (event.name) {
      case "users.signin": {
        const user = await User.findByPk(event.userId, {
          rejectOnEmpty: true,
        });

        // Only sync if user has a source avatar URL to compare against
        if (!user.sourceAvatarUrl) {
          return;
        }

        // Check if user has manually changed their avatar
        if (user.getFlag("avatarChanged")) {
          return; // Don't override user's manual avatar choice
        }

        // The sourceAvatarUrl has been updated during the authentication process
        // in userProvisioner. Now we need to check if it differs from the current
        // stored avatar and update if necessary.
        await new UploadUserAvatarTask().schedule({
          userId: user.id,
          avatarUrl: user.sourceAvatarUrl,
          isSync: true,
        });

        break;
      }
      default:
    }
  }
}
