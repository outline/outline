import { createHash } from "node:crypto";
import Logger from "@server/logging/Logger";
import { OAuthClient } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import { ImageHelper } from "@server/models/helpers/ImageHelper";
import FileStorage from "@server/storage/files";
import fetch from "@server/utils/fetch";
import { BaseTask, TaskPriority } from "./base/BaseTask";

interface Props {
  /** The OAuth client to update. */
  oauthClientId: string;
  /** The remote logo URL that the client provided. */
  logoUrl: string;
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
    const imageType = ImageHelper.detectType(body);
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
