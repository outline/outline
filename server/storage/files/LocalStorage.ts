import { Blob } from "buffer";
import { mkdir, unlink, rmdir } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { PresignedPost } from "@aws-sdk/s3-presigned-post";
import fs from "fs-extra";
import invariant from "invariant";
import JWT from "jsonwebtoken";
import safeResolvePath from "resolve-path";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import BaseStorage from "./BaseStorage";

export default class LocalStorage extends BaseStorage {
  public async getPresignedPost(
    key: string,
    acl: string,
    maxUploadSize: number,
    contentType = "image"
  ): Promise<Partial<PresignedPost>> {
    return Promise.resolve({
      url: this.getUrlForKey(key),
      fields: {
        key,
        acl,
        maxUploadSize: String(maxUploadSize),
        contentType,
      },
    });
  }

  public getUploadUrl() {
    return "/api/files.create";
  }

  public getUrlForKey(key: string): string {
    return `/api/files.get?key=${key}`;
  }

  public store = async ({
    body,
    key,
  }: {
    body: string | fs.ReadStream | Buffer | Uint8Array | Blob;
    contentLength?: number;
    contentType?: string;
    key: string;
    acl?: string;
  }) => {
    const exists = await fs.pathExists(this.getFilePath(key));
    if (exists) {
      throw ValidationError(`File already exists at ${key}`);
    }

    await mkdir(this.getFilePath(path.dirname(key)), {
      recursive: true,
    });

    let src: NodeJS.ReadableStream;
    if (body instanceof fs.ReadStream) {
      src = body;
    } else if (body instanceof Blob) {
      src = Readable.from(Buffer.from(await body.arrayBuffer()));
    } else {
      src = Readable.from(body);
    }

    const filePath = this.getFilePath(key);

    // Create the file on disk first
    await fs.createFile(filePath);

    return new Promise<string>((resolve, reject) => {
      const dest = fs
        .createWriteStream(filePath)
        .on("error", reject)
        .on("finish", () => resolve(this.getUrlForKey(key)));

      src
        .on("error", (err) => {
          dest.end();
          reject(err);
        })
        .pipe(dest);
    });
  };

  public async deleteFile(key: string) {
    const filePath = this.getFilePath(key);
    try {
      await unlink(filePath);
    } catch (err) {
      Logger.warn(`Couldn't delete ${filePath}`, err);
      return;
    }

    const directory = path.dirname(filePath);
    try {
      await rmdir(directory);
    } catch (err) {
      if (err.code === "ENOTEMPTY") {
        return;
      }
      Logger.warn(`Couldn't delete directory ${directory}`, err);
    }
  }

  public getSignedUrl = async (
    key: string,
    expiresIn = LocalStorage.defaultSignedUrlExpires
  ) => {
    const sig = JWT.sign(
      {
        key,
        type: "attachment",
      },
      env.SECRET_KEY,
      {
        expiresIn,
      }
    );
    return Promise.resolve(`${env.URL}/api/files.get?sig=${sig}`);
  };

  public async getFileHandle(key: string) {
    return {
      path: this.getFilePath(key),
      cleanup: async () => {
        // no-op, as we're reading the canonical file directly
      },
    };
  }

  public getFileStream(key: string, range?: { start: number; end: number }) {
    return Promise.resolve(fs.createReadStream(this.getFilePath(key), range));
  }

  public stat(key: string) {
    return fs.stat(this.getFilePath(key));
  }

  private getFilePath(key: string) {
    invariant(
      env.FILE_STORAGE_LOCAL_ROOT_DIR,
      "FILE_STORAGE_LOCAL_ROOT_DIR is required"
    );

    return safeResolvePath(env.FILE_STORAGE_LOCAL_ROOT_DIR, key);
  }
}
