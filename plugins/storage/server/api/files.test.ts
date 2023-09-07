import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import FormData from "form-data";
import env from "@server/env";
import "@server/test/env";
import { buildAttachment, buildUser } from "@server/test/factories";
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
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      "key: Must be of the form uploads/<uuid>/<uuid>/<name> or public/<uuid>/<uuid>/<name>"
    );
  });

  it("should succeed with status 200 ok and create a file", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const fileName = "images.docx";
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
  it("should fail with status 400 bad request if key is invalid", async () => {
    const res = await server.get(`/api/files.get?key=public/foo/bar/baz.png`);
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      "key: Must be of the form uploads/<uuid>/<uuid>/<name> or public/<uuid>/<uuid>/<name>"
    );
  });

  it("should fail with status 400 bad request if none of key or sig is supplied", async () => {
    const res = await server.get("/api/files.get");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("query: One of key or sig is required");
  });

  it("should succeed with status 200 ok when file is requested using key", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const fileName = "images.docx";
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

  it("should succeed with status 200 ok when private file is requested using signature", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      acl: "private",
    });

    const fileName = "images.docx";
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

    const res = await server.get(await attachment.signedUrl, {
      headers: { Authorization: `Bearer ${user.getJwtToken()}` },
    });
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual(attachment.contentType);
    expect(res.headers.get("Content-Disposition")).toEqual(
      'attachment; filename="images.docx"'
    );
  });
});
