import TestServer from "fetch-test-server";
import { View, CollectionUser } from "@server/models";
import webService from "@server/services/web";
import { buildUser } from "@server/test/factories";
import { flushdb, seed } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());
beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#views.list", () => {
  it("should return views for a document", async () => {
    const { user, document } = await seed();
    await View.incrementOrCreate({
      documentId: document.id,
      userId: user.id,
    });
    const res = await server.post("/api/views.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].count).toBe(1);
    expect(body.data[0].user.name).toBe(user.name);
  });

  it("should not return views for suspended user by default", async () => {
    const { user, admin, document } = await seed();
    await View.incrementOrCreate({
      documentId: document.id,
      userId: user.id,
    });

    await user.update({ suspendedAt: new Date() });

    const res = await server.post("/api/views.list", {
      body: {
        token: admin.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(0);
  });

  it("should return views for a document in read-only collection", async () => {
    const { user, document, collection } = await seed();
    collection.permission = null;
    await collection.save();
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read",
    });
    await View.incrementOrCreate({
      documentId: document.id,
      userId: user.id,
    });
    const res = await server.post("/api/views.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].count).toBe(1);
    expect(body.data[0].user.name).toBe(user.name);
  });

  it("should require authentication", async () => {
    const { document } = await seed();
    const res = await server.post("/api/views.list", {
      body: {
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/views.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#views.create", () => {
  it("should allow creating a view record for document", async () => {
    const { user, document } = await seed();
    const res = await server.post("/api/views.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.count).toBe(1);
  });

  it("should allow creating a view record for document in read-only collection", async () => {
    const { user, document, collection } = await seed();
    collection.permission = null;
    await collection.save();
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read",
    });
    const res = await server.post("/api/views.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.count).toBe(1);
  });

  it("should require authentication", async () => {
    const { document } = await seed();
    const res = await server.post("/api/views.create", {
      body: {
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post("/api/views.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});
