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
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
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
    await user.destroy();
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
});
