import {
  NotificationEventType,
  DocumentPermission,
  CollectionPermission,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Notification, UserMembership } from "@server/models";
import DocumentAccessRequestNotificationsTask from "./DocumentAccessRequestNotificationsTask";
import {
  buildCollection,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";

const ip = "127.0.0.1";

describe("DocumentAccessRequestNotificationsTask", () => {
  let task: DocumentAccessRequestNotificationsTask;

  beforeEach(() => {
    task = new DocumentAccessRequestNotificationsTask();
    jest.clearAllMocks();
  });

  describe("perform", () => {
    it("should fail with the correct error if the document is not found", async () => {
      const loggerSpy = jest.spyOn(Logger, "debug");

      await task.perform({
        name: "documents.request_access",
        documentId: "doc1",
        teamId: "team1",
        actorId: "actor1",
        ip,
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        "task",
        "Document not found for access request notification",
        { documentId: "doc1" }
      );
    });

    it("should send notifications to document managers", async () => {
      const spy = jest.spyOn(Notification, "create");
      const team = await buildTeam();
      const manager1 = await buildUser({ teamId: team.id });
      const manager2 = await buildUser({ teamId: team.id });

      const user = await buildUser({ teamId: team.id, name: "actor" });
      const document = await buildDocument({
        teamId: team.id,
      });

      for (const m of [manager1, manager2]) {
        await UserMembership.create({
          userId: m.id,
          documentId: document.id,
          createdById: m.id,
          permission: DocumentPermission.Admin,
        });
      }

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "documents.request_access",
        documentId: document.id,
        teamId: team.id,
        actorId: user.id,
        ip,
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: manager1.id,
          actorId: user.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: manager2.id,
          actorId: user.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
    });

    it("should send notifications to collection managers", async () => {
      const spy = jest.spyOn(Notification, "create");
      const team = await buildTeam();
      const manager1 = await buildUser({ teamId: team.id });
      const manager2 = await buildUser({ teamId: team.id });

      const user = await buildUser({ teamId: team.id, name: "actor" });
      const collection = await buildCollection({
        teamId: team.id,
        createdById: manager1.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });

      for (const m of [manager1, manager2]) {
        await UserMembership.create({
          userId: m.id,
          collectionId: collection.id,
          createdById: m.id,
          permission: CollectionPermission.Admin,
        });
      }

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "documents.request_access",
        documentId: document.id,
        teamId: team.id,
        actorId: user.id,
        ip,
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: manager1.id,
          actorId: user.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: manager2.id,
          actorId: user.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
    });

    it("should not send notifications to the requesting user", async () => {
      const spy = jest.spyOn(Notification, "create");
      const team = await buildTeam();
      const admin = await buildUser({ teamId: team.id });

      const document = await buildDocument({
        teamId: team.id,
        createdById: admin.id,
      });

      await UserMembership.create({
        userId: admin.id,
        documentId: document.id,
        permission: DocumentPermission.Admin,
        createdById: admin.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "documents.request_access",
        documentId: document.id,
        teamId: team.id,
        actorId: admin.id,
        ip,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it("should not send notifications to suspended users", async () => {
      const spy = jest.spyOn(Notification, "create");
      const team = await buildTeam();
      const admin = await buildUser({
        teamId: team.id,
        suspendedAt: new Date(),
      });
      const actor = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        teamId: team.id,
        createdById: admin.id,
      });

      await UserMembership.create({
        userId: admin.id,
        documentId: document.id,
        permission: DocumentPermission.Admin,
        createdById: admin.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "documents.request_access",
        documentId: document.id,
        teamId: team.id,
        actorId: actor.id,
        ip,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it("should not send notification if user has disabled this notification type", async () => {
      const spy = jest.spyOn(Notification, "create");
      const team = await buildTeam();
      const admin = await buildUser({ teamId: team.id });
      const actor = await buildUser({ teamId: team.id });

      const document = await buildDocument({
        teamId: team.id,
        createdById: admin.id,
      });

      await UserMembership.create({
        userId: admin.id,
        documentId: document.id,
        permission: DocumentPermission.Admin,
        createdById: admin.id,
      });

      // disable notifications for this event type
      admin.setNotificationEventType(
        NotificationEventType.RequestDocumentAccess,
        false
      );
      await admin.save();

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "documents.request_access",
        documentId: document.id,
        teamId: team.id,
        actorId: actor.id,
        ip,
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
