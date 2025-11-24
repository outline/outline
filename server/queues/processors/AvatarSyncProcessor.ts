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

        // Only sync if user has an avatar URL
        if (!user.avatarUrl) {
          return;
        }

        // Schedule the avatar upload task which will check if update is needed
        await new UploadUserAvatarTask().schedule({
          userId: user.id,
          avatarUrl: user.avatarUrl,
        });

        break;
      }
      default:
    }
  }
}
