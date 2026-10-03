import { createContext } from "@server/context";
import { InternalError } from "@server/errors";
import { Attachment } from "@server/models";
import FileStorage from "@server/storage/files";
import { BaseTask, TaskPriority } from "./base/BaseTask";
import { sequelize } from "@server/storage/database";

type Props = {
  /** The ID of the attachment */
  attachmentId: string;
  /** The remote URL to upload */
  url: string;
};

/**
 * A task that uploads the provided url to a known attachment.
 */
export default class UploadAttachmentFromUrlTask extends BaseTask<Props> {
  public async perform(props: Props) {
    const attachment = await Attachment.findByPk(props.attachmentId, {
      rejectOnEmpty: true,
      include: [{ association: "user" }],
    });

    const res = await FileStorage.storeFromUrl(
      props.url,
      attachment.key,
      attachment.acl
    );

    if (!res) {
      throw InternalError("Failed to upload attachment from URL");
    }

    if (res.url) {
      await sequelize.transaction(async (transaction) => {
        const ctx = createContext({ user: attachment.user, transaction });
        await attachment.updateWithCtx(ctx, {
          url: res.url,
          size: res.contentLength,
          contentType: res.contentType,
        });
      });
    }

    return {};
  }

  /**
   * removes the attachment after the final upload attempt.
   *
   * @param props upload task properties.
   * @returns a promise that resolves when cleanup is complete.
   */
  public async onFailed({ attachmentId }: Props) {
    const attachment = await Attachment.findByPk(attachmentId);
    if (!attachment) {
      return;
    }
    await attachment.destroy();
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
