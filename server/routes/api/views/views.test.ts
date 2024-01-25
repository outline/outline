import { CollectionPermission } from "@shared/types";
import { View, UserMembership } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#views.list", () => {
  it("should return views for a document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
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

  it("should not return views for suspended user by default", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ userId: user.id, teamId: team.id });
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
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.Read,
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
    const document = await buildDocument();
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
    const document = await buildDocument();
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
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
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

  it("should allow creating a view record for document in read-only collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.Read,
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
    const document = await buildDocument();
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
    const document = await buildDocument();
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
