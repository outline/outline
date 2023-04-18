import { randomElement } from "@shared/random";
import { NotificationEventType } from "@shared/types";
import {
  buildCollection,
  buildDocument,
  buildNotification,
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
    expect((randomElement(body.data) as any).user.id).toBe(user.id);
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
    expect((randomElement(body.data) as any).user.id).toBe(user.id);
    const events = body.data.map((n: any) => n.event);
    expect(events).toContain(NotificationEventType.MentionedInComment);
  });
});
