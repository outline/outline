import { createHash } from "node:crypto";
import Logger from "@server/logging/Logger";
import { OAuthClient } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
import fetch from "@server/utils/fetch";
import { BaseTask, TaskPriority } from "./base/BaseTask";

interface Props {
  /** The OAuth client to update. */
  oauthClientId: string;
  /** The remote logo URL that the client provided. */
  logoUrl: string;
}

interface ImageType {
  contentType: string;
  extension: string;
}

/**
 * A task that copies the logo of a dynamically registered or metadata document
 * OAuth client into file storage. The consent screen then never loads an image
 * from a host that the client controls, which could track users or change the
 * image at any time.
 */
export default class UploadOAuthClientLogoTask extends BaseTask<Props> {
  /** The maximum size of a logo, in bytes. */
  public static maxLogoSize = 256 * 1024;

  /** The maximum time to wait for a logo. */
  public static fetchTimeout = 5000;

  /**
   * Detect a supported raster image from its leading bytes. The content type
   * that the remote host sends is not trusted, and SVG is never accepted
   * because it can contain scripts.
   *
   * @param body The image data.
   * @returns The image type, or undefined if it is not a supported image.
   */
  public static detectImageType(body: Buffer): ImageType | undefined {
    const startsWith = (bytes: number[]) =>
      bytes.every((byte, index) => body[index] === byte);

    if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      return { contentType: "image/png", extension: "png" };
    }
    if (startsWith([0xff, 0xd8, 0xff])) {
      return { contentType: "image/jpeg", extension: "jpg" };
    }
    if (
      body
        .subarray(0, 6)
        .toString("ascii")
        .match(/^GIF8[79]a$/)
    ) {
      return { contentType: "image/gif", extension: "gif" };
    }
    if (
      body.subarray(0, 4).toString("ascii") === "RIFF" &&
      body.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return { contentType: "image/webp", extension: "webp" };
    }
    return undefined;
  }

  public async perform({ oauthClientId, logoUrl }: Props) {
    const client = await OAuthClient.findByPk(oauthClientId);
    if (!client) {
      return;
    }

    const res = await fetch(logoUrl, {
      method: "GET",
      redirect: "manual",
      allowIPAddressList: [],
      size: UploadOAuthClientLogoTask.maxLogoSize,
      signal: AbortSignal.timeout(UploadOAuthClientLogoTask.fetchTimeout),
      headers: { Accept: "image/png, image/jpeg, image/gif, image/webp" },
    });
    if (res.status !== 200) {
      Logger.info("task", "OAuth client logo could not be fetched", {
        oauthClientId,
        status: res.status,
      });
      return;
    }

    const body = await res.buffer();
    const imageType = UploadOAuthClientLogoTask.detectImageType(body);
    if (!imageType) {
      Logger.info("task", "OAuth client logo is not a supported image", {
        oauthClientId,
      });
      return;
    }

    // Content addressed, so clients that share a logo share one file.
    const hash = createHash("sha256").update(body).digest("hex");
    if (client.avatarUrl?.includes(hash)) {
      return;
    }

    const key = `${Buckets.public}/oauth-clients/${hash}/logo.${imageType.extension}`;
    const url = (await FileStorage.getFileExists(key))
      ? FileStorage.getUrlForKey(key)
      : await FileStorage.store({
          body,
          contentType: imageType.contentType,
          contentLength: body.byteLength,
          key,
          acl: "public-read",
        });

    if (url) {
      await client.update({ avatarUrl: url });
    }
  }

  public get options() {
    return {
      attempts: 2,
      priority: TaskPriority.Background,
    };
  }

  protected jobId({ oauthClientId, logoUrl }: Props) {
    const hash = createHash("sha256").update(logoUrl).digest("hex");
    return `upload-oauth-client-logo:${oauthClientId}:${hash}`;
  }
}
