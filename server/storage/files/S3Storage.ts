import path from "node:path";
import type { Readable } from "node:stream";
import type { ObjectCannedACL } from "@aws-sdk/client-s3";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { PresignedPostOptions } from "@aws-sdk/s3-presigned-post";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as getCloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";
import fs from "fs-extra";
import invariant from "invariant";
import { compact } from "es-toolkit/compat";
import tmp from "tmp";
import { toError } from "@shared/utils/error";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import BaseStorage from "./BaseStorage";
import type { AppContext } from "@server/types";

export default class S3Storage extends BaseStorage {
  constructor() {
    super();

    // Loaded here rather than at module top-level so the native CRT binding
    // only loads when S3 storage is actually used, keeping it off startup.
    // https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt
    require("@aws-sdk/signature-v4-crt");

    this.client = new S3Client({
      bucketEndpoint: env.AWS_S3_ACCELERATE_URL ? true : false,
      forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
      region: env.AWS_REGION,
      endpoint: this.getEndpoint(),
    });
  }

  public async getPresignedPost(
    _ctx: AppContext,
    key: string,
    _acl: string,
    maxUploadSize: number,
    contentType = "image"
  ) {
    const params: PresignedPostOptions = {
      // Presigned POST embeds the bucket in the form policy, so it must be the
      // real bucket name — not getBucket(), which returns the accelerate URL.
      Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME ?? "",
      Key: key,
      Conditions: compact([
        ["content-length-range", 0, maxUploadSize],
        ["starts-with", "$Content-Type", contentType],
        ["starts-with", "$Cache-Control", ""],
      ]),
      Fields: {
        "Content-Disposition": this.getContentDisposition(contentType),
        key,
        ...(env.AWS_S3_ACL && { ACL: env.AWS_S3_ACL as ObjectCannedACL }),
      },
      Expires: 3600,
    };

    return createPresignedPost(this.client, params);
  }

  /**
   * Returns a presigned PUT URL with Content-Length signed into the request so
   * S3 rejects uploads that do not match the declared size.
   *
   * @param key The path to store the file at.
   * @param acl The ACL to use.
   * @param contentLength The exact content length in bytes.
   * @param contentType The content type of the file.
   * @returns The presigned PUT URL and required headers.
   */
  public async getPresignedPut(
    key: string,
    _acl: string,
    contentLength: number,
    contentType: string
  ): Promise<{ url: string; headers: Record<string, string> }> {
    const contentDisposition = this.getContentDisposition(contentType);
    const cacheControl = "max-age=31557600";

    const command = new PutObjectCommand({
      Bucket: this.getBucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      ContentDisposition: contentDisposition,
      CacheControl: cacheControl,
      ...(env.AWS_S3_ACL && { ACL: env.AWS_S3_ACL as ObjectCannedACL }),
    });

    let url = await getSignedUrl(this.client, command, {
      expiresIn: 3600,
    });

    if (env.AWS_S3_ACCELERATE_URL) {
      url = url.replace(
        env.AWS_S3_UPLOAD_BUCKET_URL,
        env.AWS_S3_ACCELERATE_URL
      );
    }

    return {
      url,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(contentLength),
        "Content-Disposition": contentDisposition,
        "Cache-Control": cacheControl,
      },
    };
  }

  private getPublicEndpoint(isServerUpload?: boolean) {
    if (env.AWS_S3_ACCELERATE_URL) {
      return env.AWS_S3_ACCELERATE_URL;
    }
    invariant(
      env.AWS_S3_UPLOAD_BUCKET_NAME,
      "AWS_S3_UPLOAD_BUCKET_NAME is required"
    );

    // lose trailing slash if there is one and convert fake-s3 url to localhost
    // for access outside of docker containers in local development
    const isDocker = env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);

    const host = env.AWS_S3_UPLOAD_BUCKET_URL.replace(
      "s3:",
      "localhost:"
    ).replace(/\/$/, "");

    // support old path-style S3 uploads and new virtual host uploads by checking
    // for the bucket name in the endpoint url before appending.
    const isVirtualHost = host.includes(env.AWS_S3_UPLOAD_BUCKET_NAME);

    if (isVirtualHost) {
      return host;
    }

    return `${host}/${isServerUpload && isDocker ? "s3/" : ""}${
      env.AWS_S3_UPLOAD_BUCKET_NAME
    }`;
  }

  public getUploadUrl(isServerUpload?: boolean) {
    return this.getPublicEndpoint(isServerUpload);
  }

  public getUrlForKey(key: string): string {
    if (env.AWS_CLOUDFRONT_URL) {
      const base = env.AWS_CLOUDFRONT_URL.replace(/\/$/, "");
      return `${base}/${key}`;
    }
    return `${this.getPublicEndpoint()}/${key}`;
  }

  public store = async ({
    body,
    contentType,
    key,
  }: {
    body: Buffer | Uint8Array | string | Readable;
    contentLength?: number;
    contentType?: string;
    key: string;
    acl?: string;
  }) => {
    const upload = new Upload({
      client: this.client,
      params: {
        ...(env.AWS_S3_ACL && { ACL: env.AWS_S3_ACL as ObjectCannedACL }),
        Bucket: this.getBucket(),
        Key: key,
        ContentType: contentType,
        // See bug, if used causes large files to hang: https://github.com/aws/aws-sdk-js-v3/issues/3915
        // ContentLength: contentLength,
        ContentDisposition: this.getContentDisposition(contentType),
        Body: body,
      },
    });
    await upload.done();

    const endpoint = this.getPublicEndpoint(true);
    return `${endpoint}/${key}`;
  };

  public async deleteFile(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      })
    );
  }

  public getSignedUrl = async (
    key: string,
    expiresIn = S3Storage.defaultSignedUrlExpires
  ) => {
    if (env.AWS_CLOUDFRONT_URL) {
      const privateKey = this.getCloudFrontPrivateKey();
      if (!env.AWS_CLOUDFRONT_KEY_PAIR_ID || !privateKey) {
        Logger.warn(
          "AWS_CLOUDFRONT_URL is set but signing credentials are missing, falling back to S3 presigned URLs",
          { key }
        );
        return this.getS3PresignedUrl(key, expiresIn);
      }

      const cfUrl = this.getCloudFrontUrlForKey(key);

      try {
        return getCloudFrontSignedUrl({
          url: cfUrl,
          keyPairId: env.AWS_CLOUDFRONT_KEY_PAIR_ID,
          privateKey,
          dateLessThan: new Date(Date.now() + expiresIn * 1000).toISOString(),
        });
      } catch (err) {
        Logger.error(
          "Failed to sign CloudFront URL, falling back to S3",
          toError(err),
          {
            key,
            cfUrl,
          }
        );
        return this.getS3PresignedUrl(key, expiresIn);
      }
    }

    return this.getS3PresignedUrl(key, expiresIn);
  };

  public getFileHandle(key: string): Promise<{
    path: string;
    cleanup: () => Promise<void>;
  }> {
    return new Promise((resolve, reject) => {
      tmp.dir((err, tmpDir) => {
        if (err) {
          return reject(err);
        }
        const tmpFile = path.join(tmpDir, "tmp");
        const dest = fs.createWriteStream(tmpFile);
        dest.on("error", reject);
        dest.on("finish", () =>
          resolve({ path: tmpFile, cleanup: () => fs.rm(tmpFile) })
        );

        void this.getFileStream(key).then((stream) => {
          if (!stream) {
            return reject(new Error("No stream available"));
          }

          stream
            .on("error", (error) => {
              dest.end();
              reject(error);
            })
            .pipe(dest);
        });
      });
    });
  }

  public getFileExists(key: string): Promise<boolean> {
    return this.client
      .send(
        new HeadObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
        })
      )
      .then(() => true)
      .catch(() => false);
  }

  public moveFile = async (fromKey: string, toKey: string) => {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.getBucket(),
        CopySource: `${env.AWS_S3_UPLOAD_BUCKET_NAME}/${fromKey}`,
        Key: toKey,
      })
    );
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: fromKey,
      })
    );
  };

  public getFileStream(
    key: string,
    range?: { start: number; end: number }
  ): Promise<NodeJS.ReadableStream | null> {
    return this.client
      .send(
        new GetObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
          Range: range ? `bytes=${range.start}-${range.end}` : undefined,
        })
      )
      .then((item) => item.Body as NodeJS.ReadableStream)
      .catch((err) => {
        Logger.error("Error getting file stream from S3 ", err, {
          key,
        });

        return null;
      });
  }

  private client: S3Client;

  private getCloudFrontUrlForKey(key: string): string {
    if (!env.AWS_CLOUDFRONT_URL) {
      throw new Error("CloudFront URL is not configured");
    }
    const base = env.AWS_CLOUDFRONT_URL.replace(/\/$/, "");
    return `${base}/${encodeURI(key)}`;
  }

  private getCloudFrontPrivateKey(): string | undefined {
    const key = env.AWS_CLOUDFRONT_PRIVATE_KEY;
    if (!key) {
      return undefined;
    }

    if (key.includes("BEGIN")) {
      return key;
    }

    return Buffer.from(key, "base64").toString("utf-8");
  }

  private getS3PresignedUrl = async (
    key: string,
    expiresIn = S3Storage.defaultSignedUrlExpires
  ) => {
    const isDocker = env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);
    const params = {
      Bucket: this.getBucket(),
      Key: key,
    };

    if (isDocker) {
      return `${this.getPublicEndpoint()}/${key}`;
    }

    // Ensure expiration does not exceed AWS S3 Signature V4 limit of 7 days
    const clampedExpiresIn = Math.min(expiresIn, S3Storage.maxSignedUrlExpires);

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(this.client, command, {
      expiresIn: clampedExpiresIn,
    });

    if (env.AWS_S3_ACCELERATE_URL) {
      return url.replace(
        env.AWS_S3_UPLOAD_BUCKET_URL,
        env.AWS_S3_ACCELERATE_URL
      );
    }

    return url;
  };

  private getEndpoint() {
    if (env.AWS_S3_ACCELERATE_URL) {
      return env.AWS_S3_ACCELERATE_URL;
    }

    if (!env.AWS_S3_UPLOAD_BUCKET_URL) {
      return undefined;
    }

    // support old path-style S3 uploads and new virtual host uploads by
    // checking for the bucket name in the endpoint url.
    if (env.AWS_S3_UPLOAD_BUCKET_NAME) {
      const url = new URL(env.AWS_S3_UPLOAD_BUCKET_URL);
      if (url.hostname.startsWith(env.AWS_S3_UPLOAD_BUCKET_NAME + ".")) {
        Logger.warn(
          "AWS_S3_UPLOAD_BUCKET_URL contains the bucket name, this configuration combination will always point to AWS.\nRename your bucket or hostname if not using AWS S3.\nSee: https://github.com/outline/outline/issues/8025"
        );
        return undefined;
      }
    }

    return env.AWS_S3_UPLOAD_BUCKET_URL;
  }

  private getBucket() {
    return env.AWS_S3_ACCELERATE_URL || env.AWS_S3_UPLOAD_BUCKET_NAME || "";
  }
}
