import {
  CollectionPermission,
  DocumentPermission,
  NotificationEventType,
} from "@shared/types";
import { Notification, UserMembership } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildDraftDocument,
  buildNotification,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import RevokeUserNotificationsTask from "./RevokeUserNotificationsTask";

describe("RevokeUserNotificationsTask", () => {
  it("should revoke notifications for a collection the user can no longer read", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
    });

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      collectionId: collection.id,
    });

    expect(await Notification.findByPk(notification.id)).toBeNull();
  });

  it("should retain notifications when the user can still read the document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.Read,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
    });

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      collectionId: collection.id,
    });

    expect(await Notification.findByPk(notification.id)).not.toBeNull();
  });

  it("should retain notifications when the user still has a document membership", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    await UserMembership.create({
      userId: user.id,
      documentId: document.id,
      createdById: user.id,
      permission: DocumentPermission.Read,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
    });

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      collectionId: collection.id,
    });

    expect(await Notification.findByPk(notification.id)).not.toBeNull();
  });

  it("should revoke notifications for nested documents when scoped to a document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const parent = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const child = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      parentDocumentId: parent.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: child.id,
    });

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      documentId: parent.id,
    });

    expect(await Notification.findByPk(notification.id)).toBeNull();
  });

  it("should revoke notifications for a draft the user can no longer read", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDraftDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
    });

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      collectionId: collection.id,
    });

    expect(await Notification.findByPk(notification.id)).toBeNull();
  });

  it("should revoke notifications about the collection itself", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      event: NotificationEventType.AddUserToCollection,
    });

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      collectionId: collection.id,
    });

    expect(await Notification.findByPk(notification.id)).toBeNull();
  });

  it("should re-check all notifications when no scope is given", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const privateCollection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const openCollection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.Read,
    });
    const unreadable = await buildDocument({
      teamId: team.id,
      collectionId: privateCollection.id,
    });
    const readable = await buildDocument({
      teamId: team.id,
      collectionId: openCollection.id,
    });
    const revoked = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: unreadable.id,
    });
    const retained = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: readable.id,
    });
    const collectionNotification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      collectionId: privateCollection.id,
      event: NotificationEventType.AddUserToCollection,
    });

    await new RevokeUserNotificationsTask().perform({ userId: user.id });

    expect(await Notification.findByPk(revoked.id)).toBeNull();
    expect(await Notification.findByPk(retained.id)).not.toBeNull();
    expect(await Notification.findByPk(collectionNotification.id)).toBeNull();
  });

  it("should not revoke notifications outside of the given collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const other = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: other.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
    });

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      collectionId: collection.id,
    });

    expect(await Notification.findByPk(notification.id)).not.toBeNull();
  });

  it("should revoke notifications for a draft when scoped to the document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDraftDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const notification = await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
    });

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      documentId: document.id,
    });

    expect(await Notification.findByPk(notification.id)).toBeNull();
  });
});
