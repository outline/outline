/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";
import {
  buildUser,
  buildCollection,
  buildAttachment,
  buildDocument,
} from "../test/factories";
import { flushdb } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

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
