import path from "node:path";
import type { Readable } from "node:stream";
import type * as AwsS3 from "@aws-sdk/client-s3";
import type { ObjectCannedACL, S3Client } from "@aws-sdk/client-s3";
import type { PresignedPostOptions } from "@aws-sdk/s3-presigned-post";
import fs from "fs-extra";
import invariant from "invariant";
import { compact } from "es-toolkit/compat";
import tmp from "tmp";
import { toError } from "@shared/utils/error";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import BaseStorage from "./BaseStorage";
import type { AppContext } from "@server/types";

// The AWS SDK packages are imported dynamically inside methods rather than at
// module top-level so they are only loaded into memory once S3 storage is
// used — this module itself is imported regardless of the configured storage
// backend. Only the packages' type imports are free of runtime cost.
export default class S3Storage extends BaseStorage {
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

    const { createPresignedPost } = await import("@aws-sdk/s3-presigned-post");
    const { client } = await this.getS3();
    return createPresignedPost(client, params);
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

    const { sdk, client } = await this.getS3();
    const command = new sdk.PutObjectCommand({
      Bucket: this.getBucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      ContentDisposition: contentDisposition,
      CacheControl: cacheControl,
      ...(env.AWS_S3_ACL && { ACL: env.AWS_S3_ACL as ObjectCannedACL }),
    });

    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    let url = await getSignedUrl(client, command, {
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
    const { Upload } = await import("@aws-sdk/lib-storage");
    const { client } = await this.getS3();
    const upload = new Upload({
      client,
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
    const { sdk, client } = await this.getS3();
    await client.send(
      new sdk.DeleteObjectCommand({
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
        const { getSignedUrl: getCloudFrontSignedUrl } = await import(
          "@aws-sdk/cloudfront-signer"
        );
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

  public async getFileExists(key: string): Promise<boolean> {
    const { sdk, client } = await this.getS3();
    return client
      .send(
        new sdk.HeadObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
        })
      )
      .then(() => true)
      .catch(() => false);
  }

  public moveFile = async (fromKey: string, toKey: string) => {
    const { sdk, client } = await this.getS3();
    await client.send(
      new sdk.CopyObjectCommand({
        Bucket: this.getBucket(),
        CopySource: `${env.AWS_S3_UPLOAD_BUCKET_NAME}/${fromKey}`,
        Key: toKey,
      })
    );
    await client.send(
      new sdk.DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: fromKey,
      })
    );
  };

  public async getFileStream(
    key: string,
    range?: { start: number; end: number }
  ): Promise<NodeJS.ReadableStream | null> {
    const { sdk, client } = await this.getS3();
    return client
      .send(
        new sdk.GetObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
          Range: range ? `bytes=${range.start}-${range.end}` : undefined,
        })
      )
      .then((item) => item.Body as NodeJS.ReadableStream)
      .catch((err) => {
        // A missing object is reported as NoSuchKey (404), or as an
        // AccessDenied (403) referencing s3:ListBucket when the IAM identity
        // lacks the ListBucket permission — S3 masks not-found as forbidden.
        // Neither is a real error, so log quietly and return null.
        if (this.isNotFoundError(err)) {
          Logger.info("utils", "File not found in S3", { key });
        } else {
          Logger.error("Error getting file stream from S3 ", toError(err), {
            key,
          });
        }

        return null;
      });
  }

  private isNotFoundError(err: unknown): boolean {
    if (!(err instanceof Error)) {
      return false;
    }
    // A genuinely missing object is reported as NoSuchKey / NotFound (404).
    if (
      err.name === "NoSuchKey" ||
      err.name === "NotFound" ||
      this.getHttpStatusCode(err) === 404
    ) {
      return true;
    }
    // When the IAM identity lacks s3:ListBucket, S3 masks a missing object as a
    // 403 AccessDenied referencing s3:ListBucket. A 403 that does not mention
    // ListBucket is a genuine permission error and should still be surfaced.
    return err.message.includes("s3:ListBucket");
  }

  private getHttpStatusCode(err: Error): number | undefined {
    if ("$metadata" in err) {
      const metadata = err.$metadata;
      if (
        metadata &&
        typeof metadata === "object" &&
        "httpStatusCode" in metadata
      ) {
        const statusCode = metadata.httpStatusCode;
        return typeof statusCode === "number" ? statusCode : undefined;
      }
    }
    return undefined;
  }

  private s3Promise?: Promise<{ sdk: typeof AwsS3; client: S3Client }>;

  /**
   * Returns the S3 SDK module and client, loading both on first use. Loading
   * is deferred so the AWS SDK and its native CRT binding are not loaded at
   * startup.
   */
  private getS3(): Promise<{ sdk: typeof AwsS3; client: S3Client }> {
    this.s3Promise ??= (async () => {
      // Must be loaded before the client is constructed so SigV4a request
      // signing is available.
      // https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt
      await import("@aws-sdk/signature-v4-crt");

      const sdk = await import("@aws-sdk/client-s3");
      const client = new sdk.S3Client({
        bucketEndpoint: env.AWS_S3_ACCELERATE_URL ? true : false,
        forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
        region: env.AWS_REGION,
        endpoint: this.getEndpoint(),
      });
      return { sdk, client };
    })();
    return this.s3Promise;
  }

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

    const { sdk, client } = await this.getS3();
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const command = new sdk.GetObjectCommand(params);
    const url = await getSignedUrl(client, command, {
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
