import { ReadStream, createReadStream } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import JWT from "jsonwebtoken";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import fetch from "@server/utils/fetch";
import BaseStorage from "./BaseStorage";

export default class LocalStorage extends BaseStorage {
  constructor() {
    super();
  }

  public async getPresignedPost(
    key: string,
    acl: string,
    maxUploadSize: number,
    contentType = "image"
  ) {
    return Promise.resolve({
      fields: { key, acl, maxUploadSize, contentType },
    }) as Promise<any>;
  }

  public getUploadUrl() {
    return "/api/files.create";
  }

  public getUrlForKey(key: string): string {
    return `/api/files.get?key=${key}`;
  }

  public upload = async ({
    body,
    contentLength,
    contentType,
    key,
    acl,
  }: {
    body: string | ReadStream | Buffer | Uint8Array | Blob;
    contentLength: number;
    contentType: string;
    key: string;
    acl: string;
  }) => {
    const params = {
      file: {
        data: body,
        path: `${env.FILE_STORAGE_LOCAL_ROOT}/${key}`,
        acl,
      },
    };
    const res = await fetch("/api/files.create", {
      body: JSON.stringify(params),
      method: "POST",
      headers: {
        "Content-Length": contentLength.toString(),
        "Content-Type": contentType,
      },
    });

    const data = await res.json();
    if (res.status < 200 || res.status >= 300) {
      throw Error(data.message);
    }

    return this.getSignedUrl(key);
  };

  public async deleteFile(key: string) {
    const filePath = path.join(env.FILE_STORAGE_LOCAL_ROOT, key);
    try {
      await unlink(filePath);
    } catch (err) {
      Logger.warn(`Couldn't delete ${filePath}`, err);
    }
  }

  public getSignedUrl = async (key: string, expiresIn = 60) => {
    const sig = JWT.sign(
      {
        key,
        expiresAt: expiresIn
          ? new Date(Date.now() + expiresIn * 1000)
          : undefined,
        type: "attachment",
      },
      env.SECRET_KEY
    );
    return Promise.resolve(`/api/files.get?sig=${sig}`);
  };

  public getFileStream(key: string) {
    const filePath = path.join(env.FILE_STORAGE_LOCAL_ROOT, key);
    return createReadStream(filePath);
  }

  public async getFileBuffer(key: string) {
    const stream = this.getFileStream(key);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      if (!stream) {
        return reject(new Error("No stream available"));
      }

      stream.on("data", function (d) {
        chunks.push(d as Buffer);
      });
      stream.once("end", () => {
        resolve(Buffer.concat(chunks));
      });
      stream.once("error", reject);
    });
  }
}
