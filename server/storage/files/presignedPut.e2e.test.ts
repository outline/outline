import { AttachmentPreset } from "@shared/types";
import { buildUser, buildDocument } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

vi.mock("@server/storage/files");

const server = getTestServer();

describe("presigned PUT URL e2e", () => {
  it("should return presignedPutUrl for document attachment upload", async () => {
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

    expect(body.data).toHaveProperty("presignedPutUrl");
    expect(body.data).toHaveProperty("uploadUrl");
    expect(body.data).toHaveProperty("form");
    expect(body.data).toHaveProperty("attachment");

    expect(body.data.presignedPutUrl).toBe(
      "http://s3mock/presigned-put-url"
    );
    expect(body.data.uploadUrl).toBe("http://mock/create");
    expect(body.data.form["Content-Type"]).toBe("image/jpeg");
    expect(body.data.form["Cache-Control"]).toBe("max-age=31557600");

    expect(body.data.attachment.id).toBeDefined();
    expect(body.data.attachment.url).toContain("/api/attachments.redirect");
  });

  it("should return presignedPutUrl for avatar upload", async () => {
    const user = await buildUser();
    const res = await server.post("/api/attachments.create", user, {
      body: {
        name: "avatar.png",
        contentType: "image/png",
        size: 200000,
        preset: AttachmentPreset.Avatar,
      },
    });

    expect(res.status).toEqual(200);
    const body = await res.json();

    expect(body.data.presignedPutUrl).toBeDefined();
    expect(body.data.uploadUrl).toBeDefined();
    expect(body.data.form).toBeDefined();
  });

  it("should return presignedPutUrl for import upload", async () => {
    const user = await buildUser();
    const res = await server.post("/api/attachments.create", user, {
      body: {
        name: "export.zip",
        contentType: "application/zip",
        size: 100000,
        preset: AttachmentPreset.WorkspaceImport,
      },
    });

    expect(res.status).toEqual(200);
    const body = await res.json();

    expect(body.data.presignedPutUrl).toBeDefined();
    expect(body.data.uploadUrl).toBeDefined();
  });

  it("should return both POST and PUT data side by side", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/attachments.create", user, {
      body: {
        name: "test.pdf",
        contentType: "application/pdf",
        size: 50000,
        documentId: document.id,
        preset: AttachmentPreset.DocumentAttachment,
      },
    });

    expect(res.status).toEqual(200);
    const body = await res.json();

    const { uploadUrl, form, presignedPutUrl, attachment } = body.data;
    expect(uploadUrl).toEqual(expect.any(String));
    expect(form).toEqual(
      expect.objectContaining({
        "Cache-Control": "max-age=31557600",
        "Content-Type": "application/pdf",
      })
    );
    expect(presignedPutUrl).toEqual(expect.any(String));
    expect(attachment.id).toEqual(expect.any(String));
    expect(attachment.contentType).toBe("application/pdf");
  });
});
