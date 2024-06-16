import escapeRegExp from "lodash/escapeRegExp";
import startCase from "lodash/startCase";
import { Transaction } from "sequelize";
import { AttachmentPreset } from "@shared/types";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
  unicodeCLDRtoBCP47,
} from "@shared/utils/date";
import attachmentCreator from "@server/commands/attachmentCreator";
import { trace } from "@server/logging/tracing";
import { Attachment, User } from "@server/models";
import FileStorage from "@server/storage/files";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import parseImages from "@server/utils/parseImages";

@trace()
export class TextHelper {
  /**
   * Replaces template variables in the given text with the current date and time.
   *
   * @param text The text to replace the variables in
   * @param user The user to get the language/locale from
   * @returns The text with the variables replaced
   */
  static replaceTemplateVariables(text: string, user: User) {
    const locales = user.language
      ? unicodeCLDRtoBCP47(user.language)
      : undefined;

    return text
      .replace(/{date}/g, startCase(getCurrentDateAsString(locales)))
      .replace(/{time}/g, startCase(getCurrentTimeAsString(locales)))
      .replace(/{datetime}/g, startCase(getCurrentDateTimeAsString(locales)))
      .replace(/{author}/g, user.name);
  }

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
   * @param markdown The text to replace the images in
   * @param user The user context
   * @param ip The IP address of the user
   * @param transaction The transaction to use for the database operations
   * @returns The text with the images replaced
   */
  static async replaceImagesWithAttachments(
    markdown: string,
    user: User,
    ip?: string,
    transaction?: Transaction
  ) {
    let output = markdown;
    const images = parseImages(markdown);

    await Promise.all(
      images.map(async (image) => {
        // Skip attempting to fetch images that are not valid urls
        try {
          new URL(image.src);
        } catch (_e) {
          return;
        }

        const attachment = await attachmentCreator({
          name: image.alt ?? "image",
          url: image.src,
          preset: AttachmentPreset.DocumentAttachment,
          user,
          ip,
          transaction,
        });

        if (attachment) {
          output = output.replace(
            new RegExp(escapeRegExp(image.src), "g"),
            attachment.redirectUrl
          );
        }
      })
    );

    return output;
  }
}
