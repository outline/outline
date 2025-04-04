import queryString from "query-string";
import { v4 as uuidv4 } from "uuid";
import { randomElement } from "@shared/random";
import { NotificationEventType } from "@shared/types";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
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
        teamId: user.teamId,
        userId: user.id,
        viewedAt: new Date(),
        archivedAt: new Date(),
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
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
    expect(body.data.notifications.length).toBe(3);
    expect(body.pagination.total).toBe(3);
    expect(body.data.unseen).toBe(2);
    expect((randomElement(body.data.notifications) as any).actor.id).toBe(
      actor.id
    );
    expect((randomElement(body.data.notifications) as any).userId).toBe(
      user.id
    );
    const events = body.data.notifications.map((n: any) => n.event);
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
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
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
    expect(body.data.notifications.length).toBe(1);
    expect(body.pagination.total).toBe(1);
    expect(body.data.unseen).toBe(1);
    expect((randomElement(body.data.notifications) as any).actor.id).toBe(
      actor.id
    );
    expect((randomElement(body.data.notifications) as any).userId).toBe(
      user.id
    );
    const events = body.data.notifications.map((n: any) => n.event);
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
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        archivedAt: new Date(),
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
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
    expect(body.data.notifications.length).toBe(2);
    expect(body.pagination.total).toBe(2);
    expect(body.data.unseen).toBe(2);
    expect((randomElement(body.data.notifications) as any).actor.id).toBe(
      actor.id
    );
    expect((randomElement(body.data.notifications) as any).userId).toBe(
      user.id
    );
    const events = body.data.notifications.map((n: any) => n.event);
    expect(events).toContain(NotificationEventType.CreateComment);
    expect(events).toContain(NotificationEventType.UpdateDocument);
  });

  it("should return non-archived notifications", async () => {
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
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        archivedAt: new Date(),
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.list", {
      body: {
        token: user.getJwtToken(),
        archived: false,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.notifications.length).toBe(1);
    expect(body.pagination.total).toBe(1);
    expect(body.data.unseen).toBe(1);
    expect((randomElement(body.data.notifications) as any).actor.id).toBe(
      actor.id
    );
    expect((randomElement(body.data.notifications) as any).userId).toBe(
      user.id
    );
    const events = body.data.notifications.map((n: any) => n.event);
    expect(events).toContain(NotificationEventType.MentionedInComment);
  });
});

describe("#notifications.pixel", () => {
  it("should mark notification as viewed", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const actor = await buildUser({
      teamId: team.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      actorId: actor.id,
      event: NotificationEventType.UpdateDocument,
    });

    expect(notification.viewedAt).toBeNull();

    const res = await server.get(
      `/api/notifications.pixel?${queryString.stringify({
        id: notification.id,
        token: notification.pixelToken,
      })}`
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/gif");

    const reloaded = await notification.reload();
    expect(reloaded.viewedAt).not.toBeNull();
  });

  it("should not mark notification as viewed with invalid token", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const actor = await buildUser({
      teamId: team.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      actorId: actor.id,
      event: NotificationEventType.UpdateDocument,
    });

    const res = await server.get(
      `/api/notifications.pixel?${queryString.stringify({
        id: notification.id,
        token: "invalid-token",
      })}`
    );

    expect(res.status).toBe(401);

    const reloaded = await notification.reload();
    expect(reloaded.viewedAt).toBeNull();
  });

  it("should return 404 for notification that does not exist", async () => {
    const res = await server.get(
      `/api/notifications.pixel?${queryString.stringify({
        id: uuidv4(),
        token: "invalid-token",
      })}`
    );

    expect(res.status).toBe(404);
  });
});

describe("#notifications.update", () => {
  it("should mark notification as viewed", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
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
        viewedAt: new Date(),
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(notification.id);
    expect(body.data.viewedAt).not.toBeNull();
  });

  it("should archive the notification", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
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
        archivedAt: new Date(),
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(notification.id);
    expect(body.data.archivedAt).not.toBeNull();
  });
});

describe("#notifications.update_all", () => {
  it("should perform no updates", async () => {
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
        viewedAt: new Date(),
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.update_all", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(0);
  });

  it("should mark all notifications as viewed", async () => {
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
        viewedAt: new Date(),
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.update_all", {
      body: {
        token: user.getJwtToken(),
        viewedAt: new Date(),
      },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(2);
  });

  it("should mark all seen notifications as unseen", async () => {
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
        viewedAt: new Date(),
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        viewedAt: new Date(),
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.update_all", {
      body: {
        token: user.getJwtToken(),
        viewedAt: null,
      },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(2);
  });

  it("should archive all notifications", async () => {
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
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.update_all", {
      body: {
        token: user.getJwtToken(),
        archivedAt: new Date(),
      },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(2);
  });

  it("should unarchive all archived notifications", async () => {
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
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.CreateComment,
        archivedAt: new Date(),
        teamId: user.teamId,
        userId: user.id,
      }),
      buildNotification({
        actorId: actor.id,
        documentId: document.id,
        collectionId: collection.id,
        event: NotificationEventType.MentionedInComment,
        teamId: user.teamId,
        userId: user.id,
      }),
    ]);

    const res = await server.post("/api/notifications.update_all", {
      body: {
        token: user.getJwtToken(),
        archivedAt: null,
      },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(2);
  });
});

describe("#notifications.unsubscribe", () => {
  it("should allow unsubscribe with valid token", async () => {
    const user = await buildUser();
    const token = NotificationSettingsHelper.unsubscribeToken(
      user.id,
      NotificationEventType.UpdateDocument
    );

    const res = await server.get(
      `/api/notifications.unsubscribe?userId=${user.id}&token=${token}&eventType=documents.update&follow=true`,
      {
        redirect: "manual",
      }
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain(
      "/settings/notifications?success"
    );

    const events = (await user.reload()).notificationSettings;
    expect(events).not.toContain("documents.update");
  });

  it("should not allow unsubscribe with invalid token", async () => {
    const user = await buildUser();

    const res = await server.get(
      `/api/notifications.unsubscribe?userId=${user.id}&token=invalid-token&eventType=documents.update&follow=true`,
      {
        redirect: "manual",
      }
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("?notice=invalid-auth");
  });
});
