import { Blob } from "buffer";
import {
  ReadStream,
  closeSync,
  createReadStream,
  createWriteStream,
  existsSync,
  openSync,
} from "fs";
import { mkdir, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import invariant from "invariant";
import JWT from "jsonwebtoken";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import BaseStorage from "./BaseStorage";

export default class LocalStorage extends BaseStorage {
  public async getPresignedPost(
    key: string,
    acl: string,
    maxUploadSize: number,
    contentType = "image"
  ) {
    return Promise.resolve({
      url: this.getUrlForKey(key),
      fields: {
        key,
        acl,
        maxUploadSize,
        contentType,
      },
    } as any);
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
    body: string | ReadStream | Buffer | Uint8Array | Blob;
    contentLength?: number;
    contentType?: string;
    key: string;
    acl?: string;
  }) => {
    const subdir = key.split("/").slice(0, -1).join("/");
    if (!existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, subdir))) {
      await mkdir(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, subdir), {
        recursive: true,
      });
    }

    let src: NodeJS.ReadableStream;
    if (body instanceof ReadStream) {
      src = body;
    } else if (body instanceof Blob) {
      src = Readable.from(Buffer.from(await body.arrayBuffer()));
    } else {
      src = Readable.from(body);
    }

    const destPath = path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key);
    closeSync(openSync(destPath, "w"));

    return new Promise<string>((resolve, reject) => {
      const dest = createWriteStream(destPath)
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
    const filePath = path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key);
    try {
      await unlink(filePath);
    } catch (err) {
      Logger.warn(`Couldn't delete ${filePath}`, err);
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
    return Promise.resolve(`/api/files.get?sig=${sig}`);
  };

  public getFileStream(key: string) {
    invariant(
      env.FILE_STORAGE_LOCAL_ROOT_DIR,
      "FILE_STORAGE_LOCAL_ROOT_DIR is required"
    );

    const filePath = path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key);
    return createReadStream(filePath);
  }
}
