import { User, UserFlag } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
import {
  generateAvatarFilename,
  shouldUpdateAvatar,
} from "@server/utils/avatarUtils";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  /** The userId to operate on */
  userId: string;
  /** The original avatarUrl from the SSO provider */
  avatarUrl: string;
};

/**
 * A task that uploads the provided avatarUrl to S3 storage and updates the
 * user's record with the new url.
 */
export default class UploadUserAvatarTask extends BaseTask<Props> {
  public async perform(props: Props) {
    const user = await User.findByPk(props.userId, {
      rejectOnEmpty: true,
    });

    // Check if user has manually changed their avatar
    if (user.getFlag(UserFlag.AvatarChanged)) {
      return; // Don't override user's manual avatar choice
    }

    // Check if the avatar has actually changed
    if (!shouldUpdateAvatar(user.avatarUrl, props.avatarUrl)) {
      return; // No change needed
    }

    // Use deterministic filename for change detection
    const filename = generateAvatarFilename(user.id, props.avatarUrl);

    const res = await FileStorage.storeFromUrl(
      props.avatarUrl,
      `${Buckets.avatars}/${filename}`,
      "public-read"
    );

    if (res?.url) {
      await user.update({
        avatarUrl: res.url,
      });
    }
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
