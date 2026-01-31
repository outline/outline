import chunk from "lodash/chunk";
import escapeRegExp from "lodash/escapeRegExp";
import { Fragment, Node } from "prosemirror-model";
import { AttachmentPreset } from "@shared/types";
import { ProsemirrorHelper as SharedProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import attachmentCreator from "@server/commands/attachmentCreator";
import { schema } from "@server/editor";
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

  /**
   * Replaces remote and base64 encoded images in the given Prosemirror node
   * with attachment urls and uploads the images to the storage provider.
   *
   * @param ctx The API context.
   * @param doc The Prosemirror node to process.
   * @param user The user context.
   * @returns A new Prosemirror node with images replaced.
   */
  static async replaceImagesWithAttachmentsInNode(
    ctx: APIContext,
    doc: Node,
    user: User
  ): Promise<Node> {
    const images = SharedProsemirrorHelper.getImages(doc);
    const videos = SharedProsemirrorHelper.getVideos(doc);
    const nodes = [...images, ...videos];

    if (!nodes.length) {
      return doc;
    }

    const timeoutPerImage = Math.floor(
      Math.min(env.REQUEST_TIMEOUT / nodes.length, 10000)
    );

    const urlToAttachment: Map<string, Attachment> = new Map();
    const chunks = chunk(nodes, 10);

    for (const nodeChunk of chunks) {
      await Promise.all(
        nodeChunk.map(async (node) => {
          const src = String(node.attrs.src ?? "");

          // Skip invalid URLs
          try {
            new URL(src);
          } catch {
            return;
          }

          // Skip internal URLs
          if (isInternalUrl(src)) {
            return;
          }

          // Skip already processed
          if (urlToAttachment.has(src)) {
            return;
          }

          try {
            const attachment = await attachmentCreator({
              name: String(node.attrs.alt ?? node.type.name),
              url: src,
              preset: AttachmentPreset.DocumentAttachment,
              user,
              fetchOptions: {
                timeout: timeoutPerImage,
              },
              ctx,
            });

            if (attachment) {
              urlToAttachment.set(src, attachment);
            }
          } catch (err) {
            Logger.warn("Failed to download image for attachment", {
              error: err.message,
              src,
            });
          }
        })
      );
    }

    // Transform the document to replace image/video src attributes
    const transformFragment = (fragment: Fragment): Fragment => {
      const transformedNodes: Node[] = [];

      fragment.forEach((node) => {
        if (node.type.name === "image" || node.type.name === "video") {
          const src = String(node.attrs.src ?? "");
          const attachment = urlToAttachment.get(src);

          if (attachment) {
            const json = node.toJSON();
            json.attrs = { ...json.attrs, src: attachment.redirectUrl };
            transformedNodes.push(Node.fromJSON(schema, json));
          } else {
            transformedNodes.push(node);
          }
        } else if (node.content.size > 0) {
          transformedNodes.push(node.copy(transformFragment(node.content)));
        } else {
          transformedNodes.push(node);
        }
      });

      return Fragment.fromArray(transformedNodes);
    };

    return doc.copy(transformFragment(doc.content));
  }
}
