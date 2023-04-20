import { randomElement } from "@shared/random";
import { NotificationEventType } from "@shared/types";
import {
  buildCollection,
  buildDocument,
  buildNotification,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#notifications.list", () => {
  it("should return notifications in reverse chronological order", async () => {
    const actor = await buildUser();
    const user = await buildUser({
      teamId: actor.teamId,
    });
    const collection = await buildCollection({
      teamId: actor.teamId,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: actor.teamId,
      createdById: actor.id,
      collectionId: collection.id,
    });
    await Promise.all([
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.UpdateDocument,
        userId: user.id,
        viewedAt: new Date(),
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(3);
    expect(body.unseenCount).toBe(2);
    expect((randomElement(body.data) as any).actor.id).toBe(actor.id);
    expect((randomElement(body.data) as any).userId).toBe(user.id);
    const events = body.data.map((n: any) => n.event);
    expect(events).toContain(NotificationEventType.UpdateDocument);
    expect(events).toContain(NotificationEventType.CreateComment);
    expect(events).toContain(NotificationEventType.MentionedInComment);
  });

  it("should return notifications filtered by event type", async () => {
    const actor = await buildUser();
    const user = await buildUser({
      teamId: actor.teamId,
    });
    const collection = await buildCollection({
      teamId: actor.teamId,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: actor.teamId,
      createdById: actor.id,
      collectionId: collection.id,
    });
    await Promise.all([
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.UpdateDocument,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.list", {
      body: {
        token: user.getJwtToken(),
        eventType: NotificationEventType.MentionedInComment,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.unseenCount).toBe(1);
    expect((randomElement(body.data) as any).actor.id).toBe(actor.id);
    expect((randomElement(body.data) as any).userId).toBe(user.id);
    const events = body.data.map((n: any) => n.event);
    expect(events).toContain(NotificationEventType.MentionedInComment);
  });

  it("should return archived notifications", async () => {
    const actor = await buildUser();
    const user = await buildUser({
      teamId: actor.teamId,
    });
    const collection = await buildCollection({
      teamId: actor.teamId,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: actor.teamId,
      createdById: actor.id,
      collectionId: collection.id,
    });
    await Promise.all([
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.UpdateDocument,
        archivedAt: new Date(),
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        archivedAt: new Date(),
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.list", {
      body: {
        token: user.getJwtToken(),
        archived: true,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(2);
    expect(body.unseenCount).toBe(2);
    expect((randomElement(body.data) as any).actor.id).toBe(actor.id);
    expect((randomElement(body.data) as any).userId).toBe(user.id);
    const events = body.data.map((n: any) => n.event);
    expect(events).toContain(NotificationEventType.CreateComment);
    expect(events).toContain(NotificationEventType.UpdateDocument);
  });
});

describe("#notification.update", () => {
  it("should mark notification as viewed", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const actor = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      createdById: actor.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      documentId: document.id,
      collectionId: collection.id,
      userId: user.id,
      actorId: actor.id,
      event: NotificationEventType.UpdateDocument,
    });

    expect(notification.viewedAt).toBeNull();

    const res = await server.post("/api/notifications.update", {
      body: {
        token: user.getJwtToken(),
        id: notification.id,
        markAsViewed: true,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(notification.id);
    expect(body.data.viewedAt).not.toBeNull();
  });

  it("should archive the notification", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const actor = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: actor.id,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      createdById: actor.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      documentId: document.id,
      collectionId: collection.id,
      userId: user.id,
      actorId: actor.id,
      event: NotificationEventType.UpdateDocument,
    });

    expect(notification.archivedAt).toBeNull();

    const res = await server.post("/api/notifications.update", {
      body: {
        token: user.getJwtToken(),
        id: notification.id,
        archive: true,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(notification.id);
    expect(body.data.archivedAt).not.toBeNull();
  });
});
