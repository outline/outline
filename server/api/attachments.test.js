/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";
import { Attachment } from "../models";
import {
  buildUser,
  buildCollection,
  buildAttachment,
  buildDocument,
} from "../test/factories";
import { flushdb } from "../test/support";

const server = new TestServer(app.callback());

jest.mock("aws-sdk", () => {
  const mS3 = { deleteObject: jest.fn().mockReturnThis(), promise: jest.fn() };
  return {
    S3: jest.fn(() => mS3),
    Endpoint: jest.fn(),
  };
});

beforeEach(() => flushdb());
afterAll(() => server.close());

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
      body: { token: user.getJwtToken(), id: attachment.id },
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
      body: { token: user.getJwtToken(), id: attachment.id },
    });

    expect(res.status).toEqual(200);
    expect(await Attachment.count()).toEqual(0);
  });

  it("should allow deleting an attachment without a document if admin", async () => {
    const user = await buildUser({ isAdmin: true });
    const attachment = await buildAttachment({
      teamId: user.teamId,
    });

    attachment.documentId = null;
    await attachment.save();

    const res = await server.post("/api/attachments.delete", {
      body: { token: user.getJwtToken(), id: attachment.id },
    });

    expect(res.status).toEqual(200);
    expect(await Attachment.count()).toEqual(0);
  });

  it("should not allow deleting an attachment in another team", async () => {
    const user = await buildUser({ isAdmin: true });
    const attachment = await buildAttachment();

    attachment.documentId = null;
    await attachment.save();

    const res = await server.post("/api/attachments.delete", {
      body: { token: user.getJwtToken(), id: attachment.id },
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
      body: { token: user.getJwtToken(), id: attachment.id },
    });

    expect(res.status).toEqual(403);
  });

  it("should not allow deleting an attachment belonging to a document user does not have access to", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      private: true,
    });
    const document = await buildDocument({
      teamId: collection.teamId,
      userId: collection.userId,
      collectionId: collection.id,
    });
    const attachment = await buildAttachment({
      teamId: document.teamId,
      userId: document.userId,
      documentId: document.id,
      acl: "private",
    });

    const res = await server.post("/api/attachments.delete", {
      body: { token: user.getJwtToken(), id: attachment.id },
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
      body: { token: user.getJwtToken(), id: attachment.id },
      redirect: "manual",
    });

    expect(res.status).toEqual(302);
  });

  it("should always return a redirect for a public attachment", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      private: true,
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
      body: { token: user.getJwtToken(), id: attachment.id },
      redirect: "manual",
    });

    expect(res.status).toEqual(302);
  });

  it("should not return a redirect for a private attachment belonging to a document user does not have access to", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      private: true,
    });
    const document = await buildDocument({
      teamId: collection.teamId,
      userId: collection.userId,
      collectionId: collection.id,
    });
    const attachment = await buildAttachment({
      teamId: document.teamId,
      userId: document.userId,
      documentId: document.id,
      acl: "private",
    });

    const res = await server.post("/api/attachments.redirect", {
      body: { token: user.getJwtToken(), id: attachment.id },
    });

    expect(res.status).toEqual(403);
  });
});
