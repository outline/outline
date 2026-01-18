import chunk from "lodash/chunk";
import escapeRegExp from "lodash/escapeRegExp";
import { AttachmentPreset } from "@shared/types";
import attachmentCreator from "@server/commands/attachmentCreator";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import type { User } from "@server/models";
import { Attachment } from "@server/models";
import FileStorage from "@server/storage/files";
import type { APIContext } from "@server/types";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import parseImages from "@server/utils/parseImages";
import { isInternalUrl } from "@shared/utils/urls";

@trace()
export class TextHelper {
  /**
   * Converts attachment urls in documents to signed equivalents that allow
   * direct access without a session cookie
   *
   * @param text The text either html or markdown which contains urls to be converted
   * @param teamId The team context
   * @param expiresIn The time that signed urls should expire (in seconds)
   * @returns The replaced text
   */
  static async attachmentsToSignedUrls(
    text: string,
    teamId: string,
    expiresIn = 3000
  ) {
    const attachmentIds = parseAttachmentIds(text);

    await Promise.all(
      attachmentIds.map(async (id) => {
        const attachment = await Attachment.findOne({
          where: {
            id,
            teamId,
          },
        });

        if (attachment) {
          const signedUrl = await FileStorage.getSignedUrl(
            attachment.key,
            expiresIn
          );

          text = text.replace(
            new RegExp(escapeRegExp(attachment.redirectUrl), "g"),
            signedUrl
          );
        }
      })
    );
    return text;
  }

  /**
   * Replaces remote and base64 encoded images in the given text with attachment
   * urls and uploads the images to the storage provider.
   *
   * @param ctx The API context
   * @param markdown The text to replace the images in
   * @param user The user context
   * @returns The text with the images replaced
   */
  static async replaceImagesWithAttachments(
    ctx: APIContext,
    markdown: string,
    user: User,
    options: {
      /** If true, only process base64 encoded images */
      base64Only?: boolean;
    } = {}
  ) {
    let output = markdown;
    const images = parseImages(markdown);
    const timeoutPerImage = Math.floor(
      Math.min(env.REQUEST_TIMEOUT / images.length, 10000)
    );
    const chunks = chunk(images, 10);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (image) => {
          // Skip attempting to fetch images that are not valid urls
          try {
            new URL(image.src);
          } catch (_e) {
            return;
          }

          if (isInternalUrl(image.src)) {
            return;
          }
          if (options.base64Only && !image.src.startsWith("data:")) {
            return;
          }

          try {
            const attachment = await attachmentCreator({
              name: image.alt ?? "image",
              url: image.src,
              preset: AttachmentPreset.DocumentAttachment,
              user,
              fetchOptions: {
                timeout: timeoutPerImage,
              },
              ctx,
            });

            if (attachment) {
              output = output.replace(
                new RegExp(escapeRegExp(image.src), "g"),
                attachment.redirectUrl
              );
            }
          } catch (err) {
            Logger.warn("Failed to download image for attachment", {
              error: err.message,
              src: image.src,
            });
          }
        })
      );
    }

    return output;
  }
}
