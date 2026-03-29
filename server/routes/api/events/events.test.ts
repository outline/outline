import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildEvent,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#events.list", () => {
  it("should only return activity events", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: admin.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should return audit events", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    const auditEvent = await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: admin.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: admin.getJwtToken(),
        auditLog: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].id).toEqual(event.id);
    expect(body.data[1].id).toEqual(auditEvent.id);
  });

  it("should allow filtering by actorId", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    const auditEvent = await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: admin.getJwtToken(),
        auditLog: true,
        actorId: admin.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(auditEvent.id);
  });

  it("should not allow members to filter by actorId", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: user.getJwtToken(),
        actorId: admin.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow filtering by actorId when it's the current user", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // event by admin
    await buildEvent({
      name: "documents.create",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: admin.id,
    });
    // event by user
    const userEvent = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: user.getJwtToken(),
        actorId: user.id,
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(userEvent.id);
  });

  it("should allow filtering by documentId", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: admin.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should not return events for documentId without authorization", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    const actor = await buildUser();
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: actor.getJwtToken(),
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow filtering by event name", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: user.getJwtToken(),
        name: "documents.publish",
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should allow filtering by events param", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", {
      body: {
        token: user.getJwtToken(),
        events: ["documents.publish"],
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should return events with deleted actors", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    await user.destroy({ hooks: false });
    const res = await server.post("/api/events.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should require authorization for audit events", async () => {
    const user = await buildUser();
    const res = await server.post("/api/events.list", {
      body: {
        token: user.getJwtToken(),
        auditLog: true,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/events.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should not return events for private drafts created by other users", async () => {
    const user1 = await buildUser();
    const user2 = await buildUser({ teamId: user1.teamId });

    // user1 creates a private draft (no collection, not published)
    const privateDraft = await buildDocument({
      userId: user1.id,
      teamId: user1.teamId,
      collectionId: null,
      publishedAt: null,
    });

    // Verify the draft has no collection
    expect(privateDraft.collectionId).toBeNull();
    expect(privateDraft.publishedAt).toBeNull();

    // Event for the private draft (using an ACTIVITY event)
    await buildEvent({
      name: "documents.delete",
      documentId: privateDraft.id,
      collectionId: null,
      teamId: user1.teamId,
      actorId: user1.id,
    });

    // user2 tries to list events without specifying documentId/collectionId
    const res = await server.post("/api/events.list", {
      body: {
        token: user2.getJwtToken(),
      },
    });

    // Non-admins cannot list events without documentId or collectionId
    expect(res.status).toEqual(403);

    // Also verify user2 cannot see the draft when filtering by documentId
    const res2 = await server.post("/api/events.list", {
      body: {
        token: user2.getJwtToken(),
        documentId: privateDraft.id,
      },
    });
    expect(res2.status).toEqual(403);
  });

  it("should return events without collection for admins", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });

    // user creates a private draft (no collection, not published)
    const privateDraft = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: null,
      publishedAt: null,
    });

    // Event for the private draft
    const draftEvent = await buildEvent({
      name: "documents.delete",
      documentId: privateDraft.id,
      collectionId: null,
      teamId: user.teamId,
      actorId: user.id,
    });

    // admin lists events
    const res = await server.post("/api/events.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);

    // admin SHOULD see events for documents without a collection
    const eventIds = body.data.map((e: any) => e.id);
    expect(eventIds).toContain(draftEvent.id);
  });

  it("should allow non-admins to list events when collectionId is specified", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });

    const event = await buildEvent({
      name: "documents.publish",
      documentId: document.id,
      collectionId: collection.id,
      teamId: user.teamId,
      actorId: user.id,
    });

    // user lists events for their collection
    const res = await server.post("/api/events.list", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });
});
