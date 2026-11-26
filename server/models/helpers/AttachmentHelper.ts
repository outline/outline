import { Readable } from "node:stream";
import { addHours } from "date-fns";
import type { ZipFile } from "yazl";
import { AttachmentPreset } from "@shared/types";
import { errToString, toError } from "@shared/utils/error";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import type Attachment from "@server/models/Attachment";
import { ValidateKey } from "@server/validation";
import { AttachmentValidation } from "@shared/validations";

export enum Buckets {
  public = "public",
  uploads = "uploads",
  avatars = "avatars",
}

export default class AttachmentHelper {
  static maximumFileNameLength = 255;

  /**
   * Get the upload location for the given upload details
   *
   * @param id The ID of the attachment
   * @param name The name of the attachment
   * @param userId The ID of the user uploading the attachment
   */
  static getKey({
    id,
    name,
    userId,
  }: {
    id: string;
    name: string;
    userId: string;
  }) {
    const keyPrefix = `${Buckets.uploads}/${userId}/${id}`;
    return ValidateKey.sanitize(
      `${keyPrefix}/${name.slice(0, this.maximumFileNameLength)}`
    );
  }

  /**
   * Parse a key into its constituent parts
   *
   * @param key The key to parse
   * @returns The constituent parts
   */
  static parseKey(key: string): {
    bucket: string;
    userId: string;
    id: string;
    fileName: string | undefined;
    isPublicBucket: boolean;
  } {
    const parts = key.split("/");
    const bucket = parts[0];
    const userId = parts[1];
    const id = parts[2];
    const [fileName] = parts.length > 3 ? parts.slice(-1) : [];

    return {
      bucket,
      userId,
      id,
      fileName,
      isPublicBucket: bucket === Buckets.avatars || bucket === Buckets.public,
    };
  }

  /**
   * Get the ACL to use for a given attachment preset
   *
   * @param preset The preset to use
   * @returns A valid attachment ACL
   */
  static presetToAcl(preset: AttachmentPreset) {
    switch (preset) {
      case AttachmentPreset.Avatar:
        return "public-read";
      default:
        return env.AWS_S3_ACL || "private";
    }
  }

  /**
   * Get the expiration time for a given attachment preset
   *
   * @param preset The preset to use
   * @returns An expiration time
   */
  static presetToExpiry(preset: AttachmentPreset) {
    switch (preset) {
      case AttachmentPreset.Import:
      case AttachmentPreset.WorkspaceImport:
        return addHours(new Date(), 24);
      default:
        return undefined;
    }
  }

  /**
   * Get the maximum upload size for a given attachment preset
   *
   * @param preset The preset to use
   * @returns The maximum upload size in bytes
   */
  static presetToMaxUploadSize(preset: AttachmentPreset) {
    switch (preset) {
      case AttachmentPreset.Import:
        return env.FILE_STORAGE_IMPORT_MAX_SIZE;
      case AttachmentPreset.WorkspaceImport:
        return env.FILE_STORAGE_WORKSPACE_IMPORT_MAX_SIZE;
      case AttachmentPreset.Emoji:
        return AttachmentValidation.emojiMaxFileSize;
      case AttachmentPreset.Avatar:
      case AttachmentPreset.DocumentAttachment:
      default:
        return env.FILE_STORAGE_UPLOAD_MAX_SIZE;
    }
  }

  /**
   * Read the contents of an attachment from storage. An attachment that cannot
   * be read is treated as empty so that a single missing file does not fail the
   * export it is part of.
   *
   * @param attachment The attachment to read
   * @returns The contents of the attachment.
   */
  static async readBuffer(attachment: Attachment): Promise<Buffer> {
    try {
      return await attachment.buffer;
    } catch (err) {
      Logger.warn(`Failed to read attachment from storage`, {
        attachmentId: attachment.id,
        teamId: attachment.teamId,
        error: errToString(err),
      });
      return Buffer.from("");
    }
  }

  /**
   * Add an attachment to an archive. The contents are streamed from storage
   * when the archive writes the entry, so the file is never held in memory.
   *
   * A read that fails, or stops part way through, fails the archive, because a
   * truncated archive looks complete. An attachment that is missing from
   * storage is written as an empty entry, so that one missing file does not
   * make the export impossible.
   *
   * @param zip The archive to add the attachment to.
   * @param attachment The attachment to add.
   * @param pathInZip The path of the attachment in the archive.
   * @param signal An optional signal that stops the read when aborted.
   */
  static addToArchive(
    zip: ZipFile,
    attachment: Attachment,
    pathInZip: string,
    signal?: AbortSignal
  ) {
    zip.addReadStreamLazy(
      pathInZip,
      { mtime: attachment.updatedAt },
      (callback) => {
        if (signal?.aborted) {
          return callback(null, Readable.from([]));
        }

        attachment.stream.then(
          (stream) => {
            if (!stream) {
              Logger.warn(`Attachment is missing from storage`, {
                attachmentId: attachment.id,
                teamId: attachment.teamId,
              });
              return callback(null, Readable.from([]));
            }

            // The client can disconnect while the stream is being opened.
            if (signal?.aborted) {
              if (stream instanceof Readable) {
                stream.destroy();
              }
              return callback(null, Readable.from([]));
            }

            // yazl ignores errors on input streams, so forward them to fail the
            // archive; otherwise the entry never ends and the output hangs open.
            stream.on("error", (err) => zip.emit("error", toError(err)));

            if (signal && stream instanceof Readable) {
              const handleAbort = () => stream.destroy();
              signal.addEventListener("abort", handleAbort, { once: true });
              stream.once("close", () =>
                signal.removeEventListener("abort", handleAbort)
              );
            }

            return callback(null, stream);
          },
          (err) => callback(toError(err), Readable.from([]))
        );
      }
    );
  }
}
