import { AttachmentPreset } from "@shared/types";
import env from "@server/env";
import { buildUser, buildDocument } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

vi.mock("@server/storage/files");

const server = getTestServer();

describe("AWS_S3_UPLOAD_METHOD config", () => {
  it("should return only PUT data when method is put", async () => {
    const original = env.AWS_S3_UPLOAD_METHOD;
    env.AWS_S3_UPLOAD_METHOD = "put";

    try {
      const user = await buildUser();
      const document = await buildDocument({
        teamId: user.teamId,
        userId: user.id,
      });

      const res = await server.post("/api/attachments.create", user, {
        body: {
          name: "photo.jpg",
          contentType: "image/jpeg",
          size: 500000,
          documentId: document.id,
          preset: AttachmentPreset.DocumentAttachment,
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();

      expect(body.data.mode).toBe("put");
      expect(body.data.url).toBe("http://s3mock/presigned-put-url");
      expect(body.data.headers).toEqual(
        expect.objectContaining({
          "Content-Type": expect.any(String),
          "Content-Length": "500000",
          "Content-Disposition": expect.any(String),
          "Cache-Control": "max-age=31557600",
        })
      );
      expect(body.data.uploadUrl).toBeUndefined();
      expect(body.data.form).toBeUndefined();
      expect(body.data.attachment.id).toBeDefined();
      expect(body.data.attachment.url).toContain("/api/attachments.redirect");
    } finally {
      env.AWS_S3_UPLOAD_METHOD = original;
    }
  });

  it("should return only POST data when method is post", async () => {
    const original = env.AWS_S3_UPLOAD_METHOD;
    env.AWS_S3_UPLOAD_METHOD = "post";

    try {
      const user = await buildUser();
      const res = await server.post("/api/attachments.create", user, {
        body: {
          name: "photo.jpg",
          contentType: "image/jpeg",
          size: 500000,
          preset: AttachmentPreset.Avatar,
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();

      expect(body.data.mode).toBe("post");
      expect(body.data.uploadUrl).toBeDefined();
      expect(body.data.form).toBeDefined();
      expect(body.data.form["Content-Type"]).toBe("image/jpeg");
      expect(body.data.form["Cache-Control"]).toBe("max-age=31557600");
      expect(body.data.url).toBeUndefined();
      expect(body.data.headers).toBeUndefined();
      expect(body.data.attachment).toBeDefined();
    } finally {
      env.AWS_S3_UPLOAD_METHOD = original;
    }
  });

  it("should default to post method", async () => {
    const user = await buildUser();
    const res = await server.post("/api/attachments.create", user, {
      body: {
        name: "test.png",
        contentType: "image/png",
        size: 1000,
        preset: AttachmentPreset.Avatar,
      },
    });

    expect(res.status).toEqual(200);
    const body = await res.json();

    expect(body.data.mode).toBe("post");
    expect(body.data.uploadUrl).toBeDefined();
    expect(body.data.form).toBeDefined();
    expect(body.data.url).toBeUndefined();
  });

  it("should return correct headers for PUT with various content types", async () => {
    const original = env.AWS_S3_UPLOAD_METHOD;
    env.AWS_S3_UPLOAD_METHOD = "put";

    try {
      const user = await buildUser();
      const document = await buildDocument({
        teamId: user.teamId,
        userId: user.id,
      });

      const res = await server.post("/api/attachments.create", user, {
        body: {
          name: "report.pdf",
          contentType: "application/pdf",
          size: 50000,
          documentId: document.id,
          preset: AttachmentPreset.DocumentAttachment,
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();

      expect(body.data.mode).toBe("put");
      expect(body.data.url).toBeDefined();
      expect(body.data.headers).toEqual(
        expect.objectContaining({
          "Content-Type": expect.any(String),
          "Content-Length": "50000",
          "Cache-Control": expect.any(String),
        })
      );
      expect(body.data.attachment.contentType).toBe("application/pdf");
    } finally {
      env.AWS_S3_UPLOAD_METHOD = original;
    }
  });
});
