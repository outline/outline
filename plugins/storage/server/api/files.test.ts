import { existsSync, copyFileSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import FormData from "form-data";
import { ensureDirSync } from "fs-extra";
import { v4 as uuidV4 } from "uuid";
import { FileOperationState, FileOperationType } from "@shared/types";
import env from "@server/env";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
import {
  buildAttachment,
  buildFileOperation,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#files.create", () => {
  it("should fail with status 400 bad request if key is invalid", async () => {
    const user = await buildUser();
    const res = await server.post("/api/files.create", {
      body: {
        token: user.getJwtToken(),
        key: "public/foo/bar/baz.png",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should fail with status 401 if associated attachment does not belong to user", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    form.append("token", user.getJwtToken());

    const res = await server.post(`/api/files.create`, {
      headers: form.getHeaders(),
      body: form,
    });
    expect(res.status).toEqual(403);
  });

  it("should fail with status 401 if file exists on disk", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        userId: user.id,
        teamId: user.teamId,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key)
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    form.append("token", user.getJwtToken());

    const res = await server.post(`/api/files.create`, {
      headers: form.getHeaders(),
      body: form,
    });
    expect(res.status).toEqual(400);
  });

  it("should succeed with status 200 ok and create a file", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    form.append("token", user.getJwtToken());

    const res = await server.post(`/api/files.create`, {
      headers: form.getHeaders(),
      body: form,
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(true);
  });
});

describe("#files.get", () => {
  it("should fail with status 404 if existing file is requested with key", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const key = path.join("uploads", user.id, uuidV4(), fileName);

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    const res = await server.get(`/api/files.get?key=${key}`);
    expect(res.status).toEqual(404);
  });

  it("should fail with status 404 if non-existing file is requested with key", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const key = path.join("uploads", user.id, uuidV4(), fileName);
    const res = await server.get(`/api/files.get?key=${key}`);
    expect(res.status).toEqual(404);
  });

  it("should fail with status 400 bad request if key is invalid", async () => {
    const res = await server.get(`/api/files.get?key=public/foo/bar/baz.png`);
    expect(res.status).toEqual(400);
  });

  it("should fail with status 400 bad request if neither key or sig is supplied", async () => {
    const res = await server.get("/api/files.get");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("query: One of key or sig is required");
  });

  it("should succeed with status 200 ok when attachment is requested using key", async () => {
    const user = await buildUser();
    const fileName = "images.docx";

    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    form.append("token", user.getJwtToken());

    await server.post(`/api/files.create`, {
      headers: form.getHeaders(),
      body: form,
    });

    const res = await server.get(attachment.canonicalUrl);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual(attachment.contentType);
    expect(res.headers.get("Content-Disposition")).toEqual(
      'attachment; filename="images.docx"'
    );
  });

  it("should succeed with status 200 ok when private attachment is requested using signature", async () => {
    const user = await buildUser();
    const fileName = "images.docx";

    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        acl: "private",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    form.append("token", user.getJwtToken());

    await server.post(`/api/files.create`, {
      headers: form.getHeaders(),
      body: form,
    });

    const url = new URL(await attachment.signedUrl);
    const res = await server.get(url.pathname + url.search);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual(attachment.contentType);
    expect(res.headers.get("Content-Disposition")).toEqual(
      'attachment; filename="images.docx"'
    );
  });

  it("should succeed with status 200 ok when file is requested using signature", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const { key } = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        acl: "private",
      },
      fileName
    );
    const signedUrl = await FileStorage.getSignedUrl(key);

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    const url = new URL(signedUrl);
    const res = await server.get(url.pathname + url.search);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(res.headers.get("Content-Disposition")).toEqual(
      'attachment; filename="images.docx"'
    );
  });

  it("should succeed with status 200 ok when avatar is requested using key", async () => {
    const user = await buildUser();
    const key = path.join("avatars", user.id, uuidV4());
    await buildAttachment({
      key,
      teamId: user.teamId,
      userId: user.id,
      contentType: "image/jpg",
      acl: "public-read",
    });

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", "avatar.jpg"),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    const res = await server.get(`/api/files.get?key=${key}`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual("image/jpg");
    expect(res.headers.get("Content-Disposition")).toEqual("attachment");
  });

  it("should succeed with status 200 ok when exported file is requested using signature", async () => {
    const user = await buildUser();
    const fileName = "export-markdown.zip";
    const key = `${Buckets.uploads}/${user.teamId}/${uuidV4()}/${fileName}`;

    await buildFileOperation({
      userId: user.id,
      teamId: user.teamId,
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
      key,
    });

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    const signedUrl = await FileStorage.getSignedUrl(key);
    const url = new URL(signedUrl);
    const res = await server.get(url.pathname + url.search);

    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual("application/zip");
    expect(res.headers.get("Content-Disposition")).toEqual(
      'attachment; filename="export-markdown.zip"'
    );
  });
});
