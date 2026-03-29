import { createHash } from "node:crypto";
import { AttachmentPreset } from "@shared/types";
import attachmentCreator from "@server/commands/attachmentCreator";
import { createContext } from "@server/context";
import { Attachment, User } from "@server/models";
import { BaseTask, TaskPriority } from "./base/BaseTask";

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

    const hash = createHash("sha256").update(props.avatarUrl).digest("hex");

    // If the user's avatar URL already contains this hash, skip the upload.
    // This handles old-style canonical S3 URLs that include the hash in the path.
    if (user.avatarUrl?.includes(hash)) {
      return;
    }

    // For redirect-style avatar URLs, check if the underlying attachment
    // already has this hash in its key to avoid re-uploading the same avatar.
    const redirectMatch = user.avatarUrl?.match(
      /attachments\.redirect\?id=([^&]+)/
    );
    if (redirectMatch) {
      const existing = await Attachment.findByPk(redirectMatch[1]);
      if (existing?.key.endsWith(`/${hash}`)) {
        return;
      }
    }

    const attachment = await attachmentCreator({
      name: hash,
      url: props.avatarUrl,
      user,
      preset: AttachmentPreset.Avatar,
      ctx: createContext({ user }),
    });

    if (attachment) {
      await user.update({ avatarUrl: attachment.redirectUrl });
    }
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
