import type { MockInstance } from "vitest";
import { Plan } from "@shared/types";
import { Team } from "@server/models";
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
  let planSpy: MockInstance<() => Plan>;

  beforeEach(() => {
    planSpy = vi
      .spyOn(Team.prototype, "plan", "get")
      .mockReturnValue(Plan.Business);
  });

  afterEach(() => {
    planSpy.mockRestore();
  });

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
    const res = await server.post("/api/events.list", user, {
      body: {
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
    const res = await server.post("/api/events.list", admin, {
      body: {
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
    const res = await server.post("/api/events.list", admin, {
      body: {
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
    const res = await server.post("/api/events.list", user, {
      body: {
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
    const res = await server.post("/api/events.list", user, {
      body: {
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
    const res = await server.post("/api/events.list", admin, {
      body: {
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
    const res = await server.post("/api/events.list", actor, {
      body: {
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
    const res = await server.post("/api/events.list", user, {
      body: {
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
    const res = await server.post("/api/events.list", user, {
      body: {
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
    const res = await server.post("/api/events.list", admin);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should require the audit log entitlement", async () => {
    planSpy.mockReturnValue(Plan.Community);
    const admin = await buildAdmin();
    const res = await server.post("/api/events.list", admin, {
      body: {
        auditLog: true,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authorization for audit events", async () => {
    const user = await buildUser();
    const res = await server.post("/api/events.list", user, {
      body: {
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
    const res = await server.post("/api/events.list", user2);

    // Non-admins cannot list events without documentId or collectionId
    expect(res.status).toEqual(403);

    // Also verify user2 cannot see the draft when filtering by documentId
    const res2 = await server.post("/api/events.list", user2, {
      body: {
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
    const res = await server.post("/api/events.list", admin);

    const body = await res.json();
    expect(res.status).toEqual(200);

    // admin SHOULD see events for documents without a collection
    const eventIds = body.data.map((e: { id: string }) => e.id);
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
    const res = await server.post("/api/events.list", user, {
      body: {
        collectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  describe("tag events", () => {
    it("should return tag events in the audit log", async () => {
      const admin = await buildAdmin();

      let res = await server.post("/api/tags.create", admin, {
        body: { name: "roadmap" },
      });
      expect(res.status).toEqual(200);
      const tag = (await res.json()).data;

      res = await server.post("/api/tags.update", admin, {
        body: { id: tag.id, name: "planning" },
      });
      expect(res.status).toEqual(200);

      res = await server.post("/api/tags.delete", admin, {
        body: { id: tag.id },
      });
      expect(res.status).toEqual(200);

      res = await server.post("/api/events.list", admin, {
        body: { auditLog: true },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      const tagEvents = body.data.filter(
        (event: { modelId: string }) => event.modelId === tag.id
      );
      expect(tagEvents.map((event: { name: string }) => event.name)).toEqual([
        "tags.delete",
        "tags.update",
        "tags.create",
      ]);
      expect(tagEvents[0].data).toEqual({ name: "planning" });
      expect(tagEvents[1].changes.previous.name).toEqual("roadmap");
    });

    it("should return a tags.merge event recording the source tag", async () => {
      const admin = await buildAdmin();

      let res = await server.post("/api/tags.create", admin, {
        body: { name: "audit-old" },
      });
      const source = (await res.json()).data;
      res = await server.post("/api/tags.create", admin, {
        body: { name: "audit-new" },
      });
      const target = (await res.json()).data;

      res = await server.post("/api/tags.merge", admin, {
        body: { sourceId: source.id, targetId: target.id },
      });
      expect(res.status).toEqual(200);

      res = await server.post("/api/events.list", admin, {
        body: { auditLog: true },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      const mergeEvent = body.data.find(
        (event: { name: string; modelId: string }) =>
          event.name === "tags.merge" && event.modelId === target.id
      );

      expect(mergeEvent).toBeDefined();
      expect(mergeEvent.data).toEqual({
        sourceId: source.id,
        sourceName: "audit-old",
      });
    });

    it("should return tag add and remove events in document activity", async () => {
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

      let res = await server.post("/api/tags.create", user, {
        body: { name: "backlog" },
      });
      const tag = (await res.json()).data;

      res = await server.post("/api/tags.add", user, {
        body: { tagId: tag.id, documentId: document.id },
      });
      expect(res.status).toEqual(200);
      res = await server.post("/api/tags.remove", user, {
        body: { tagId: tag.id, documentId: document.id },
      });
      expect(res.status).toEqual(200);

      res = await server.post("/api/events.list", user, {
        body: { documentId: document.id },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      const tagEvents = body.data.filter((event: { name: string }) =>
        event.name.startsWith("tags.")
      );
      expect(tagEvents.map((event: { name: string }) => event.name)).toEqual([
        "tags.remove",
        "tags.add",
      ]);
      expect(tagEvents[0].data).toEqual({ tagId: tag.id });
    });
  });
});
