import { Blob } from "buffer";
import { Readable } from "stream";
import { PresignedPost } from "aws-sdk/clients/s3";
import { isBase64Url } from "@shared/utils/urls";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import fetch from "@server/utils/fetch";

export default abstract class BaseStorage {
  /** The default number of seconds until a signed URL expires. */
  public static defaultSignedUrlExpires = 60;

  /**
   * Returns a presigned post for uploading files to the storage provider.
   *
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @param maxUploadSize The maximum upload size in bytes
   * @param contentType The content type of the file
   * @returns The presigned post object to use on the client (TODO: Abstract away from S3)
   */
  public abstract getPresignedPost(
    key: string,
    acl: string,
    maxUploadSize: number,
    contentType: string
  ): Promise<Partial<PresignedPost>>;

  /**
   * Returns a stream for reading a file from the storage provider.
   *
   * @param key The path to the file
   */
  public abstract getFileStream(key: string): NodeJS.ReadableStream | null;

  /**
   * Returns the upload URL for the storage provider.
   *
   * @param isServerUpload Whether the upload is happening on the server or not
   * @returns {string} The upload URL
   */
  public abstract getUploadUrl(isServerUpload?: boolean): string;

  /**
   * Returns the download URL for a given file.
   *
   * @param key The path to the file
   * @returns {string} The download URL for the file
   */
  public abstract getUrlForKey(key: string): string;

  /**
   * Returns a signed URL for a file from the storage provider.
   *
   * @param key The path to the file
   * @param expiresIn An optional number of seconds until the URL expires
   */
  public abstract getSignedUrl(
    key: string,
    expiresIn?: number
  ): Promise<string>;

  /**
   * Store a file in the storage provider.
   *
   * @param body The file body
   * @param contentLength The content length of the file
   * @param contentType The content type of the file
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @returns The URL of the file
   */
  public abstract store({
    body,
    contentLength,
    contentType,
    key,
    acl,
  }: {
    body: Buffer | Uint8Array | Blob | string | Readable;
    contentLength?: number;
    contentType?: string;
    key: string;
    acl?: string;
  }): Promise<string | undefined>;

  /**
   * Returns a buffer of a file from the storage provider.
   *
   * @param key The path to the file
   */
  public async getFileBuffer(key: string) {
    const stream = this.getFileStream(key);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      if (!stream) {
        return reject(new Error("No stream available"));
      }

      stream.on("data", (d) => {
        chunks.push(d);
      });
      stream.once("end", () => {
        resolve(Buffer.concat(chunks));
      });
      stream.once("error", reject);
    });
  }

  /**
   * Upload a file to the storage provider directly from a remote or base64 encoded URL.
   *
   * @param url The URL to upload from
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @returns A promise that resolves when the file is uploaded
   */
  public async storeFromUrl(
    url: string,
    key: string,
    acl: string
  ): Promise<
    | {
        url: string;
        contentType: string;
        contentLength: number;
      }
    | undefined
  > {
    const endpoint = this.getUploadUrl(true);
    if (url.startsWith("/api") || url.startsWith(endpoint)) {
      return;
    }

    let buffer, contentType;
    const match = isBase64Url(url);

    if (match) {
      contentType = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else {
      try {
        const res = await fetch(url, {
          follow: 3,
          redirect: "follow",
          size: env.FILE_STORAGE_UPLOAD_MAX_SIZE,
          timeout: 10000,
        });

        if (!res.ok) {
          throw new Error(`Error fetching URL to upload: ${res.status}`);
        }

        buffer = await res.buffer();

        contentType =
          res.headers.get("content-type") ?? "application/octet-stream";
      } catch (err) {
        Logger.error("Error fetching URL to upload", err, {
          url,
          key,
          acl,
        });
        return;
      }
    }

    const contentLength = buffer.byteLength;
    if (contentLength === 0) {
      return;
    }

    try {
      const result = await this.store({
        body: buffer,
        contentType,
        key,
        acl,
      });

      return result
        ? {
            url: result,
            contentLength,
            contentType,
          }
        : undefined;
    } catch (err) {
      Logger.error("Error uploading to file storage from URL", err, {
        url,
        key,
        acl,
      });
      return;
    }
  }

  /**
   * Delete a file from the storage provider.
   *
   * @param key The path to the file
   * @returns A promise that resolves when the file is deleted
   */
  public abstract deleteFile(key: string): Promise<void>;
}
