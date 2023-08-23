import { Readable } from "stream";
import { PresignedPost } from "aws-sdk/clients/s3";
import Logger from "@server/logging/Logger";
import fetch from "@server/utils/fetch";

export default abstract class BaseStorage {
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
  ): Promise<PresignedPost>;

  /**
   * Returns a stream for reading a file from the storage provider.
   *
   * @param key The path to the file
   */
  public abstract getFileStream(key: string): NodeJS.ReadableStream | null;

  /**
   * Returns a buffer of a file from the storage provider.
   *
   * @param key The path to the file
   */
  public abstract getFileBuffer(key: string): Promise<Blob>;

  /**
   * Returns the public endpoint for the storage provider.
   *
   * @param isServerUpload Whether the upload is happening on the server or not
   * @returns The public endpoint as a string
   */
  public abstract getPublicEndpoint(isServerUpload?: boolean): string;

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
   * Upload a file to the storage provider.
   *
   * @param body The file body
   * @param contentLength The content length of the file
   * @param contentType The content type of the file
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @returns The URL of the file
   */
  public abstract upload({
    body,
    contentLength,
    contentType,
    key,
    acl,
  }: {
    body: Buffer | Uint8Array | Blob | string | Readable;
    contentLength: number;
    contentType: string;
    key: string;
    acl: string;
  }): Promise<string | undefined>;

  /**
   * Upload a file to the storage provider directly from a remote URL.
   *
   * @param url The URL to upload from
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @returns The URL of the file
   */
  public async uploadFromUrl(url: string, key: string, acl: string) {
    const endpoint = this.getPublicEndpoint(true);
    if (url.startsWith("/api") || url.startsWith(endpoint)) {
      return;
    }

    try {
      const res = await fetch(url);
      const buffer = await res.buffer();
      return this.upload({
        body: buffer,
        contentLength: res.headers["content-length"],
        contentType: res.headers["content-type"],
        key,
        acl,
      });
    } catch (err) {
      Logger.error("Error uploading to S3 from URL", err, {
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
