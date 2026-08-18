import type { Blob } from "node:buffer";
import type { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";
import type { PresignedPost } from "@aws-sdk/s3-presigned-post";
import contentDisposition from "content-disposition";
import { omit } from "es-toolkit/compat";
import { toError, errToString } from "@shared/utils/error";
import FileHelper from "@shared/editor/lib/FileHelper";
import { isBase64Url, isInternalUrl } from "@shared/utils/urls";
import { Minute, Week } from "@shared/utils/time";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import type { RequestInit } from "@server/utils/fetch";
import fetch, { chromeUserAgent, Headers } from "@server/utils/fetch";
import type { AppContext } from "@server/types";

export default abstract class BaseStorage {
  /** The default number of seconds until a signed URL expires. */
  public static defaultSignedUrlExpires = 300;

  /**
   * The maximum number of seconds until a signed URL expires for S3 Signature V4.
   * AWS S3 Signature V4 presigned URLs must have an expiration date less than one week in the future.
   */
  public static maxSignedUrlExpires = Week.seconds;

  /**
   * The longest period over which the signing timestamp is held constant. See
   * `getSigningDate` for why this matters.
   */
  public static maxSigningWindow = 15 * Minute.seconds;

  /**
   * Rounds the current time down to a fixed window so that repeated signatures
   * of the same file produce an identical URL. Without this every signature is
   * unique and caches can never be reused, which means the same file is
   * downloaded again for each URL.
   *
   * The window never exceeds half of the requested lifetime, so a returned URL
   * is always valid for at least half of `expiresIn`. Because the window only
   * moves the signing time backwards, a URL never outlives the lifetime it
   * would have had without it.
   *
   * @param expiresIn The number of seconds until the signed URL expires.
   * @returns The timestamp to sign with.
   */
  protected static getSigningDate(expiresIn: number): Date {
    const window = Math.min(
      BaseStorage.maxSigningWindow,
      Math.floor(expiresIn / 2)
    );

    if (window < 1) {
      return new Date();
    }

    const windowMs = window * 1000;
    return new Date(Math.floor(Date.now() / windowMs) * windowMs);
  }

  /**
   * Returns a presigned post for uploading files to the storage provider.
   *
   * @param ctx The request context
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @param maxUploadSize The maximum upload size in bytes
   * @param contentType The content type of the file
   * @returns The presigned post object to use on the client (TODO: Abstract away from S3)
   */
  public abstract getPresignedPost(
    ctx: AppContext,
    key: string,
    acl: string,
    maxUploadSize: number,
    contentType: string
  ): Promise<Partial<PresignedPost>>;

  /**
   * Returns a presigned PUT URL and the headers the client must send with the
   * PUT request. Subclasses that support PUT-based uploads (e.g. S3) should
   * override this method. Returns undefined by default, signalling the client
   * should fall back to the POST flow.
   *
   * @param key The path to store the file at.
   * @param acl The ACL to use.
   * @param contentLength The exact content length in bytes, signed into the URL.
   * @param contentType The content type of the file.
   * @returns The presigned PUT URL and required headers, or undefined if not supported.
   */
  public getPresignedPut(
    _key: string,
    _acl: string,
    _contentLength: number,
    _contentType: string
  ): Promise<{ url: string; headers: Record<string, string> } | undefined> {
    return Promise.resolve(undefined);
  }

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
    if (!stream) {
      throw new Error("No stream available");
    }
    return buffer(stream);
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

      // Validate size for base64 URLs, same as for remote URLs
      const maxSize = Math.min(
        options?.maxUploadSize ?? Infinity,
        env.FILE_STORAGE_UPLOAD_MAX_SIZE
      );

      if (buffer.byteLength > maxSize) {
        Logger.warn("Base64 URL exceeds size limit", {
          size: buffer.byteLength,
          maxSize,
          key,
        });
        return;
      }
    } else {
      try {
        const headers = new Headers(init?.headers);
        if (!headers.has("User-Agent")) {
          headers.set("User-Agent", chromeUserAgent);
        }
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
          error: errToString(err),
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
      Logger.error("Error uploading to file storage from URL", toError(err), {
        url,
        key,
        acl,
      });
      return;
    }
  }

  public abstract getFileExists(key: string): Promise<boolean>;

  public abstract moveFile(fromKey: string, toKey: string): Promise<void>;

  /**
   * Delete a file from the storage provider.
   *
   * @param key The path to the file
   * @returns A promise that resolves when the file is deleted
   */
  public abstract deleteFile(key: string): Promise<void>;

  /**
   * Returns the Content-Disposition header value for a given content type and
   * file name. Including the file name ensures browsers keep the original
   * extension when downloading, rather than deriving one from the content type.
   *
   * The value is always US-ASCII, a name outside that range being carried in the
   * RFC 5987 `filename*` parameter. Request signing hashes header values as
   * UTF-8 while Node writes them as Latin-1, so a raw high byte here makes the
   * storage provider calculate a different signature and reject the upload.
   *
   * @param contentType The content type
   * @param fileName The name of the file, if known
   * @returns The Content-Disposition header value
   */
  public getContentDisposition(contentType?: string, fileName?: string) {
    return contentDisposition(fileName, {
      type: this.getContentDispositionType(contentType),
      fallback: fileName?.replace(/[^\x20-\x7e]/g, "?"),
    });
  }

  /**
   * Returns the content disposition type for a given content type.
   *
   * @param contentType The content type
   * @returns The content disposition type
   */
  public getContentDispositionType(
    contentType?: string
  ): "inline" | "attachment" {
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
