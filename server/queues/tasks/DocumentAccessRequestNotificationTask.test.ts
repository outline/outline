import {
  NotificationEventType,
  DocumentPermission,
  CollectionPermission,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { AccessRequest, Notification, UserMembership } from "@server/models";
import DocumentAccessRequestNotificationsTask from "./DocumentAccessRequestNotificationsTask";
import {
  buildAdmin,
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
      const manager1 = await buildAdmin({ teamId: team.id });
      const manager2 = await buildUser({ teamId: team.id });

      const actor = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        teamId: team.id,
        userId: manager1.id,
      });

      // give manager2 admin access to the document
      await UserMembership.create({
        userId: manager2.id,
        documentId: document.id,
        createdById: manager2.id,
        permission: DocumentPermission.Admin,
      });

      await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "documents.request_access",
        documentId: document.id,
        teamId: team.id,
        actorId: actor.id,
        ip,
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: manager1.id,
          actorId: actor.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: manager2.id,
          actorId: actor.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
    });

    it("should send notifications to collection managers", async () => {
      const spy = jest.spyOn(Notification, "create");
      const team = await buildTeam();
      const manager1 = await buildAdmin({ teamId: team.id });
      const manager2 = await buildUser({ teamId: team.id });

      const actor = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        createdById: manager1.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });

      await UserMembership.create({
        userId: manager2.id,
        collectionId: collection.id,
        createdById: manager2.id,
        permission: CollectionPermission.Admin,
      });
      await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "documents.request_access",
        documentId: document.id,
        teamId: team.id,
        actorId: actor.id,
        ip,
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: manager1.id,
          actorId: actor.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: manager2.id,
          actorId: actor.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
    });

    it("should not send notifications to suspended users", async () => {
      const spy = jest.spyOn(Notification, "create");
      const team = await buildTeam();
      const manager = await buildUser({
        teamId: team.id,
        suspendedAt: new Date(),
      });
      const actor = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        teamId: team.id,
        createdById: manager.id,
      });

      await UserMembership.create({
        userId: manager.id,
        documentId: document.id,
        permission: DocumentPermission.Admin,
        createdById: manager.id,
      });
      await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
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
      const admin = await buildAdmin({ teamId: team.id });
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
      await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
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
