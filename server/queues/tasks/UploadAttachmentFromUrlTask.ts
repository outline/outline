import { errToString } from "@shared/utils/error";
import { createContext } from "@server/context";
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

    try {
      const res = await FileStorage.storeFromUrl(
        props.url,
        attachment.key,
        attachment.acl
      );

      if (res?.url) {
        await sequelize.transaction(async (transaction) => {
          const ctx = createContext({ user: attachment.user, transaction });
          await attachment.updateWithCtx(ctx, {
            url: res.url,
            size: res.contentLength,
            contentType: res.contentType,
          });
        });
      }
    } catch (err) {
      return { error: errToString(err) };
    }

    return {};
  }

  public get options() {
    return {
      attempts: 3,

      // A request waits for this task, so it runs ahead of background work.
      priority: TaskPriority.High,

      // Keep the result for a short time so that Job.finished can read it if
      // the completed event is missed.
      removeOnComplete: { age: 60 },
      removeOnFail: { age: 60 },
    };
  }
}
