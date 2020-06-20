/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";
import { CollectionUser } from "../models";
import { flushdb, seed } from "../test/support";
import { buildUser, buildShare } from "../test/factories";

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe("#shares.list", async () => {
  it("should only return shares created by user", async () => {
    const { user, admin, document } = await seed();
    await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: admin.id,
    });
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(share.id);
    expect(body.data[0].documentTitle).toBe(document.title);
  });

  it("should not return revoked shares", async () => {
    const { user, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    await share.revoke(user.id);

    const res = await server.post("/api/shares.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("admins should return shares created by all users", async () => {
    const { user, admin, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: admin.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.list", {
      body: { token: admin.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(share.id);
    expect(body.data[0].documentTitle).toBe(document.title);
  });

  it("admins should not return shares in collection not a member of", async () => {
    const { admin, document, collection } = await seed();
    await buildShare({
      documentId: document.id,
      teamId: admin.teamId,
      userId: admin.id,
    });

    collection.private = true;
    await collection.save();

    const res = await server.post("/api/shares.list", {
      body: { token: admin.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/shares.list");
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#shares.create", async () => {
  it("should allow creating a share record for document", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/shares.create", {
      body: { token: user.getJwtToken(), documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.documentTitle).toBe(document.title);
  });

  it("should allow creating a share record for document in read-only collection", async () => {
    const { user, document, collection } = await seed();
    collection.private = true;
    await collection.save();

    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read",
    });

    const res = await server.post("/api/shares.create", {
      body: { token: user.getJwtToken(), documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.documentTitle).toBe(document.title);
  });

  it("should allow creating a share record if link previously revoked", async () => {
    const { user, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    await share.revoke();
    const res = await server.post("/api/shares.create", {
      body: { token: user.getJwtToken(), documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(share.id);
    expect(body.data.documentTitle).toBe(document.title);
  });

  it("should return existing share link for document and user", async () => {
    const { user, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.create", {
      body: { token: user.getJwtToken(), documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toBe(share.id);
  });

  it("should not allow creating a share record if disabled", async () => {
    const { user, document, team } = await seed();
    await team.update({ sharing: false });
    const res = await server.post("/api/shares.create", {
      body: { token: user.getJwtToken(), documentId: document.id },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const { document } = await seed();
    const res = await server.post("/api/shares.create", {
      body: { documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/shares.create", {
      body: { token: user.getJwtToken(), documentId: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#shares.revoke", async () => {
  it("should allow author to revoke a share", async () => {
    const { user, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/shares.revoke", {
      body: { token: user.getJwtToken(), id: share.id },
    });
    expect(res.status).toEqual(200);
  });

  it("should allow admin to revoke a share", async () => {
    const { user, admin, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/shares.revoke", {
      body: { token: admin.getJwtToken(), id: share.id },
    });
    expect(res.status).toEqual(200);
  });

  it("should require authentication", async () => {
    const { user, document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/shares.revoke", {
      body: { id: share.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/shares.create", {
      body: { token: user.getJwtToken(), documentId: document.id },
    });
    expect(res.status).toEqual(403);
  });
});
