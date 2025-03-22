import { Sema } from "async-sema";
import Logger from "@server/logging/Logger";
import { Attachment } from "@server/models";
import FileStorage from "@server/storage/files";
import BaseTask, { TaskPriority } from "./BaseTask";

const ConcurrentUploads = 5;

type Item = {
  /** The ID of the attachment */
  attachmentId: string;
  /** The remote URL to upload */
  url: string;
};

/**
 * A task that uploads a list of provided urls to known attachments.
 */
export default class UploadAttachmentsForImportTask extends BaseTask<Item[]> {
  public async perform(items: Item[]) {
    const sema = new Sema(ConcurrentUploads, {
      // perf: pre-allocate the queue size
      capacity:
        items.length > ConcurrentUploads ? items.length : ConcurrentUploads,
    });

    const uploadPromises = items.map(async (item) => {
      try {
        await sema.acquire();

        const attachment = await Attachment.findByPk(item.attachmentId, {
          rejectOnEmpty: true,
        });

        // This means the attachment has already been uploaded.
        if (String(attachment.size) !== "0") {
          return;
        }

        const res = await FileStorage.storeFromUrl(
          item.url,
          attachment.key,
          attachment.acl
        );

        if (res) {
          await attachment.update({
            size: res.contentLength,
            contentType: res.contentType,
          });
        }
      } catch (err) {
        Logger.error("error uploading attachments for import", err);
        throw err;
      } finally {
        sema.release();
      }
    });

    return await Promise.all(uploadPromises);
  }

  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Normal,
    };
  }
}
