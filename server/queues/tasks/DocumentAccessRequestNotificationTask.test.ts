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
    vi.clearAllMocks();
  });

  describe("perform", () => {
    it("should fail with the correct error if the document is not found", async () => {
      const loggerSpy = vi.spyOn(Logger, "debug");

      await task.perform({
        name: "access_requests.create",
        modelId: "ar1",
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
      const spy = vi.spyOn(Notification, "create");
      const team = await buildTeam();
      const manager1 = await buildUser({ teamId: team.id });
      const manager2 = await buildUser({ teamId: team.id });

      const actor = await buildUser({ teamId: team.id });
      const document = await buildDocument({ teamId: team.id });

      await UserMembership.create({
        userId: manager1.id,
        documentId: document.id,
        createdById: manager1.id,
        permission: DocumentPermission.Admin,
      });
      await UserMembership.create({
        userId: manager2.id,
        documentId: document.id,
        createdById: manager2.id,
        permission: DocumentPermission.Admin,
      });

      const accessRequest = await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "access_requests.create",
        modelId: accessRequest.id,
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
      const spy = vi.spyOn(Notification, "create");
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
      const accessRequest = await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "access_requests.create",
        modelId: accessRequest.id,
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
      const spy = vi.spyOn(Notification, "create");
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
      const accessRequest = await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "access_requests.create",
        modelId: accessRequest.id,
        documentId: document.id,
        teamId: team.id,
        actorId: actor.id,
        ip,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it("should not send notification if user has disabled this notification type", async () => {
      const spy = vi.spyOn(Notification, "create");
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
      const accessRequest = await AccessRequest.create({
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
        name: "access_requests.create",
        modelId: accessRequest.id,
        documentId: document.id,
        teamId: team.id,
        actorId: actor.id,
        ip,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it("should fall back to workspace admins when no document or collection admin is set", async () => {
      const spy = vi.spyOn(Notification, "create");
      const team = await buildTeam();
      const workspaceAdmin = await buildAdmin({ teamId: team.id });
      const actor = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });

      // Remove the auto-created collection admin membership so workspace admin
      // is the only fallback target.
      await UserMembership.destroy({ where: { collectionId: collection.id } });

      const accessRequest = await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "access_requests.create",
        modelId: accessRequest.id,
        documentId: document.id,
        teamId: team.id,
        actorId: actor.id,
        ip,
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: NotificationEventType.RequestDocumentAccess,
          userId: workspaceAdmin.id,
          actorId: actor.id,
          documentId: document.id,
          teamId: team.id,
        })
      );
    });

    it("should not fall back to workspace admins when document admins exist", async () => {
      const spy = vi.spyOn(Notification, "create");
      const team = await buildTeam();
      const workspaceAdmin = await buildAdmin({ teamId: team.id });
      const documentAdmin = await buildUser({ teamId: team.id });
      const actor = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        teamId: team.id,
        createdById: documentAdmin.id,
      });

      await UserMembership.create({
        userId: documentAdmin.id,
        documentId: document.id,
        permission: DocumentPermission.Admin,
        createdById: documentAdmin.id,
      });

      const accessRequest = await AccessRequest.create({
        documentId: document.id,
        userId: actor.id,
        teamId: team.id,
      });

      const task = new DocumentAccessRequestNotificationsTask();
      await task.perform({
        name: "access_requests.create",
        modelId: accessRequest.id,
        documentId: document.id,
        teamId: team.id,
        actorId: actor.id,
        ip,
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: documentAdmin.id,
        })
      );
      expect(spy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          userId: workspaceAdmin.id,
        })
      );
    });
  });
});
