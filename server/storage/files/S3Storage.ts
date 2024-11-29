import path from "path";
import { Readable } from "stream";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import "@aws-sdk/signature-v4-crt"; // https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt
import {
  PresignedPostOptions,
  createPresignedPost,
} from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs-extra";
import invariant from "invariant";
import compact from "lodash/compact";
import tmp from "tmp";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import BaseStorage from "./BaseStorage";

export default class S3Storage extends BaseStorage {
  constructor() {
    super();

    this.client = new S3Client({
      bucketEndpoint: env.AWS_S3_ACCELERATE_URL ? true : false,
      forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
      region: env.AWS_REGION,
      endpoint: this.getEndpoint(),
    });
  }

  public async getPresignedPost(
    key: string,
    acl: string,
    maxUploadSize: number,
    contentType = "image"
  ) {
    const params: PresignedPostOptions = {
      Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME as string,
      Key: key,
      Conditions: compact([
        ["content-length-range", 0, maxUploadSize],
        ["starts-with", "$Content-Type", contentType],
        ["starts-with", "$Cache-Control", ""],
      ]),
      Fields: {
        "Content-Disposition": this.getContentDisposition(contentType),
        key,
        acl,
      },
      Expires: 3600,
    };

    return createPresignedPost(this.client, params);
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
    return `${this.getPublicEndpoint()}/${key}`;
  }

  public store = async ({
    body,
    contentType,
    key,
    acl,
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
        ACL: acl as ObjectCannedACL,
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
    const isDocker = env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);
    const params = {
      Bucket: this.getBucket(),
      Key: key,
    };

    if (isDocker) {
      return `${this.getPublicEndpoint()}/${key}`;
    } else {
      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(this.client, command, { expiresIn });

      if (env.AWS_S3_ACCELERATE_URL) {
        return url.replace(
          env.AWS_S3_UPLOAD_BUCKET_URL,
          env.AWS_S3_ACCELERATE_URL
        );
      }

      return url;
    }
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

  private getEndpoint() {
    if (env.AWS_S3_ACCELERATE_URL) {
      return env.AWS_S3_ACCELERATE_URL;
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
