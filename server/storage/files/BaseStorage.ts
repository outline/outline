import { Blob } from "buffer";
import { Readable } from "stream";
import { PresignedPost } from "@aws-sdk/s3-presigned-post";
import omit from "lodash/omit";
import FileHelper from "@shared/editor/lib/FileHelper";
import { isBase64Url, isInternalUrl } from "@shared/utils/urls";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import fetch, { chromeUserAgent, RequestInit } from "@server/utils/fetch";

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
   * Returns a promise that resolves with a stream for reading a file from the storage provider.
   *
   * @param key The path to the file
   */
  public abstract getFileStream(
    key: string,
    range?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream | null>;

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
   * Returns a file handle for a file from the storage provider.
   *
   * @param key The path to the file
   * @returns The file path and a cleanup function
   */
  public abstract getFileHandle(key: string): Promise<{
    path: string;
    cleanup: () => Promise<void>;
  }>;

  /**
   * Returns a promise that resolves to a buffer of a file from the storage provider.
   *
   * @param key The path to the file
   * @returns A promise that resolves with the file buffer
   */
  public async getFileBuffer(key: string) {
    const stream = await this.getFileStream(key);
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
   * @param init Optional fetch options to use
   * @param options Optional upload options
   * @returns A promise that resolves when the file is uploaded
   */
  public async storeFromUrl(
    url: string,
    key: string,
    acl: string,
    init?: RequestInit,
    options?: { maxUploadSize?: number }
  ): Promise<
    | {
        url: string;
        contentType: string;
        contentLength: number;
      }
    | undefined
  > {
    const endpoint = this.getUploadUrl(true);

    // Early return if url is already uploaded to the storage provider
    if (url.startsWith(endpoint) || isInternalUrl(url)) {
      return;
    }

    let buffer, contentType;
    const match = isBase64Url(url);

    if (match) {
      contentType = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else {
      try {
        const headers = {
          "User-Agent": chromeUserAgent,
          ...init?.headers,
        };
        const initWithoutHeaders = omit(init, ["headers"]);

        const res = await fetch(url, {
          follow: 3,
          redirect: "follow",
          size: Math.min(
            options?.maxUploadSize ?? Infinity,
            env.FILE_STORAGE_UPLOAD_MAX_SIZE
          ),
          headers,
          timeout: 10000,
          ...initWithoutHeaders,
        });

        if (!res.ok) {
          throw new Error(`Error fetching URL to upload: ${res.status}`);
        }

        buffer = await res.buffer();

        contentType =
          res.headers.get("content-type") ?? "application/octet-stream";
      } catch (err) {
        Logger.warn("Error fetching URL to upload", {
          error: err.message,
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

  /**
   * Returns the content disposition for a given content type.
   *
   * @param contentType The content type
   * @returns The content disposition
   */
  public getContentDisposition(contentType?: string) {
    if (!contentType) {
      return "attachment";
    }

    if (
      FileHelper.isAudio(contentType) ||
      FileHelper.isVideo(contentType) ||
      this.safeInlineContentTypes.includes(contentType)
    ) {
      return "inline";
    }

    return "attachment";
  }

  /**
   * A list of content types considered safe to display inline in the browser.
   * Note that SVGs are purposefully not included here as they can contain JS.
   */
  protected safeInlineContentTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ];
}
