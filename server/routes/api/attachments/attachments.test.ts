import { AttachmentPreset, CollectionPermission } from "@shared/types";
import { UserMembership } from "@server/models";
import Attachment from "@server/models/Attachment";
import {
  buildUser,
  buildAdmin,
  buildCollection,
  buildAttachment,
  buildDocument,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

jest.mock("@server/storage/files");

const server = getTestServer();

describe("#attachments.create", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/attachments.create");
    expect(res.status).toEqual(401);
  });

  describe("member", () => {
    it("should allow upload using avatar preset", async () => {
      const user = await buildUser();
      const res = await server.post("/api/attachments.create", {
        body: {
          name: "test.png",
          contentType: "image/png",
          size: 1000,
          preset: AttachmentPreset.Avatar,
          token: user.getJwtToken(),
        },
      });
      expect(res.status).toEqual(200);

      const body = await res.json();
      const attachment = await Attachment.findByPk(body.data.attachment.id, {
        rejectOnEmpty: true,
      });
      expect(attachment.expiresAt).toBeNull();
    });

    it("should allow attachment creation for documents", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });

      const res = await server.post("/api/attachments.create", {
        body: {
          name: "test.png",
          contentType: "image/png",
          size: 1000,
          documentId: document.id,
          preset: AttachmentPreset.DocumentAttachment,
          token: user.getJwtToken(),
        },
      });
      expect(res.status).toEqual(200);
    });

    it("should create expiring attachment using import preset", async () => {
      const user = await buildUser();
      const res = await server.post("/api/attachments.create", {
        body: {
          name: "test.zip",
          contentType: "application/zip",
          size: 10000,
          preset: AttachmentPreset.WorkspaceImport,
          token: user.getJwtToken(),
        },
      });
      expect(res.status).toEqual(200);

      const body = await res.json();
      const attachment = await Attachment.findByPk(body.data.attachment.id, {
        rejectOnEmpty: true,
      });
      expect(attachment.expiresAt).toBeTruthy();
    });

    it("should not allow attachment creation for other documents", async () => {
      const user = await buildUser();
      const document = await buildDocument();

      const res = await server.post("/api/attachments.create", {
        body: {
          name: "test.png",
          contentType: "image/png",
          size: 1000,
          documentId: document.id,
          preset: AttachmentPreset.DocumentAttachment,
          token: user.getJwtToken(),
        },
      });
      expect(res.status).toEqual(403);
    });

    it("should not allow file upload for avatar preset", async () => {
      const user = await buildUser();
      const res = await server.post("/api/attachments.create", {
        body: {
          name: "test.pdf",
          contentType: "application/pdf",
          size: 1000,
          preset: AttachmentPreset.Avatar,
          token: user.getJwtToken(),
        },
      });
      expect(res.status).toEqual(400);
    });
  });

  describe("viewer", () => {
    it("should allow attachment creation for documents in collections with edit access", async () => {
      const user = await buildViewer();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        teamId: user.teamId,
        collectionId: collection.id,
      });

      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.ReadWrite,
      });

      const res = await server.post("/api/attachments.create", {
        body: {
          name: "test.png",
          contentType: "image/png",
          size: 1000,
          documentId: document.id,
          preset: AttachmentPreset.DocumentAttachment,
          token: user.getJwtToken(),
        },
      });
      expect(res.status).toEqual(200);
    });

    it("should not allow attachment creation for documents", async () => {
      const user = await buildViewer();
      const document = await buildDocument({ teamId: user.teamId });

      const res = await server.post("/api/attachments.create", {
        body: {
          name: "test.png",
          contentType: "image/png",
          size: 1000,
          documentId: document.id,
          preset: AttachmentPreset.DocumentAttachment,
          token: user.getJwtToken(),
        },
      });
      expect(res.status).toEqual(403);
    });

    it("should allow upload using avatar preset", async () => {
      const user = await buildViewer();
      const res = await server.post("/api/attachments.create", {
        body: {
          name: "test.png",
          contentType: "image/png",
          size: 1000,
          preset: AttachmentPreset.Avatar,
          token: user.getJwtToken(),
        },
      });
      expect(res.status).toEqual(200);
    });
  });
});

describe("#attachments.delete", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/attachments.delete");
    expect(res.status).toEqual(401);
  });

  it("should allow deleting an attachment belonging to a document user has access to", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/attachments.delete", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
    });
    expect(res.status).toEqual(200);
    expect(
      await Attachment.count({
        where: {
          teamId: user.teamId,
        },
      })
    ).toEqual(0);
  });

  it("should allow deleting an attachment without a document created by user", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });
    attachment.documentId = null;
    await attachment.save();
    const res = await server.post("/api/attachments.delete", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
    });
    expect(res.status).toEqual(200);
    expect(
      await Attachment.count({
        where: {
          teamId: user.teamId,
        },
      })
    ).toEqual(0);
  });

  it("should allow deleting an attachment without a document if admin", async () => {
    const user = await buildAdmin();
    const attachment = await buildAttachment({
      teamId: user.teamId,
    });
    attachment.documentId = null;
    await attachment.save();
    const res = await server.post("/api/attachments.delete", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
    });
    expect(res.status).toEqual(200);
    expect(
      await Attachment.count({
        where: {
          teamId: user.teamId,
        },
      })
    ).toEqual(0);
  });

  it("should not allow deleting an attachment in another team", async () => {
    const user = await buildAdmin();
    const attachment = await buildAttachment();
    attachment.documentId = null;
    await attachment.save();
    const res = await server.post("/api/attachments.delete", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow deleting an attachment without a document", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
    });
    attachment.documentId = null;
    await attachment.save();
    const res = await server.post("/api/attachments.delete", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow deleting an attachment belonging to a document user does not have access to", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
    });
    const document = await buildDocument({
      teamId: collection.teamId,
      userId: collection.createdById,
      collectionId: collection.id,
    });
    const attachment = await buildAttachment({
      teamId: document.teamId,
      userId: document.createdById,
      documentId: document.id,
      acl: "private",
    });
    const res = await server.post("/api/attachments.delete", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#attachments.redirect", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/attachments.redirect");
    expect(res.status).toEqual(401);
  });

  it("should return a redirect for an attachment belonging to a document user has access to", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/attachments.redirect", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
      redirect: "manual",
    });
    expect(res.status).toEqual(302);
  });

  it("should return a redirect for the attachment if id supplied via query params", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post(
      `/api/attachments.redirect?id=${attachment.id}`,
      {
        body: {
          token: user.getJwtToken(),
        },
        redirect: "manual",
      }
    );
    expect(res.status).toEqual(302);
  });

  it("should return a redirect for an attachment belonging to a trashed document user has access to", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      deletedAt: new Date(),
    });
    const attachment = await buildAttachment({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/attachments.redirect", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
      redirect: "manual",
    });
    expect(res.status).toEqual(302);
  });

  it("should always return a redirect for a public attachment", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/attachments.redirect", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
      redirect: "manual",
    });
    expect(res.status).toEqual(302);
  });

  it("should not return a redirect for a private attachment belonging to a document user does not have access to", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
    });
    const document = await buildDocument({
      teamId: collection.teamId,
      userId: collection.createdById,
      collectionId: collection.id,
    });
    const attachment = await buildAttachment({
      teamId: document.teamId,
      userId: document.createdById,
      documentId: document.id,
      acl: "private",
    });
    const res = await server.post("/api/attachments.redirect", {
      body: {
        token: user.getJwtToken(),
        id: attachment.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should fail in absence of id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/attachments.redirect", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id is required");
  });
});
