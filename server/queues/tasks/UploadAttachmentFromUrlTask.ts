import { createContext } from "@server/context";
import { Attachment } from "@server/models";
import FileStorage from "@server/storage/files";
import BaseTask, { TaskPriority } from "./BaseTask";

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

    try {
      const res = await FileStorage.storeFromUrl(
        props.url,
        attachment.key,
        attachment.acl
      );

      if (res?.url) {
        const ctx = createContext({ user: attachment.user });
        await attachment.updateWithCtx(ctx, {
          url: res.url,
          size: res.contentLength,
          contentType: res.contentType,
        });
      }
    } catch (err) {
      return { error: err.message };
    }

    return {};
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
