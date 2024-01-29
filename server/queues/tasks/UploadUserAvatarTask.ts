import { v4 as uuidv4 } from "uuid";
import { User } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
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

    const res = await FileStorage.storeFromUrl(
      props.avatarUrl,
      `${Buckets.avatars}/${user.id}/${uuidv4()}`,
      "public-read"
    );

    if (res?.url) {
      await user.update({ avatarUrl: res.url });
    }
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
