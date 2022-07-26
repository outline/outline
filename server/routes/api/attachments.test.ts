import TestServer from "fetch-test-server";
import Attachment from "@server/models/Attachment";
import webService from "@server/services/web";
import {
  buildUser,
  buildAdmin,
  buildCollection,
  buildAttachment,
  buildDocument,
} from "@server/test/factories";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());

jest.mock("@server/utils/s3");

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#attachments.create", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/attachments.create");
    expect(res.status).toEqual(401);
  });

  it("should allow simple image upload for public attachments", async () => {
    const user = await buildUser();
    const res = await server.post("/api/attachments.create", {
      body: {
        name: "test.png",
        contentType: "image/png",
        size: 1000,
        public: true,
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should not allow file upload for public attachments", async () => {
    const user = await buildUser();
    const res = await server.post("/api/attachments.create", {
      body: {
        name: "test.pdf",
        contentType: "application/pdf",
        size: 1000,
        public: true,
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(400);
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
    expect(await Attachment.count()).toEqual(0);
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
    expect(await Attachment.count()).toEqual(0);
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
    expect(await Attachment.count()).toEqual(0);
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
});
