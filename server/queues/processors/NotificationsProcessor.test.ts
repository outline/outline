import { View, NotificationSetting } from "@server/models";
import EmailTask from "@server/queues/tasks/EmailTask";
import {
  buildDocument,
  buildCollection,
  buildUser,
} from "@server/test/factories";
import { flushdb } from "@server/test/support";
import NotificationsProcessor from "./NotificationsProcessor";

jest.mock("@server/queues/tasks/EmailTask");
const ip = "127.0.0.1";

beforeEach(() => flushdb());
beforeEach(jest.resetAllMocks);

describe("documents.publish", () => {
  test("should not send a notification to author", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      lastModifiedById: user.id,
    });
    await NotificationSetting.create({
      userId: user.id,
      teamId: user.teamId,
      event: "documents.publish",
    });

    const processor = new NotificationsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: {
        title: document.title,
      },
      ip,
    });
    expect(EmailTask.schedule).not.toHaveBeenCalled();
  });

  test("should send a notification to other users in team", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
    });
    await NotificationSetting.create({
      userId: user.id,
      teamId: user.teamId,
      event: "documents.publish",
    });

    const processor = new NotificationsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: {
        title: document.title,
      },
      ip,
    });
    expect(EmailTask.schedule).toHaveBeenCalled();
  });

  test("should not send a notification to users without collection access", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
    });
    await NotificationSetting.create({
      userId: user.id,
      teamId: user.teamId,
      event: "documents.publish",
    });
    const processor = new NotificationsProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: {
        title: document.title,
      },
      ip,
    });
    expect(EmailTask.schedule).not.toHaveBeenCalled();
  });
});

describe("revisions.create", () => {
  test("should send a notification to other collaborators", async () => {
    const document = await buildDocument();
    const collaborator = await buildUser({
      teamId: document.teamId,
    });
    document.collaboratorIds = [collaborator.id];
    await document.save();
    await NotificationSetting.create({
      userId: collaborator.id,
      teamId: collaborator.teamId,
      event: "documents.update",
    });
    const processor = new NotificationsProcessor();
    await processor.perform({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
    });
    expect(EmailTask.schedule).toHaveBeenCalled();
  });

  test("should not send a notification if viewed since update", async () => {
    const document = await buildDocument();
    const collaborator = await buildUser({
      teamId: document.teamId,
    });
    document.collaboratorIds = [collaborator.id];
    await document.save();
    await NotificationSetting.create({
      userId: collaborator.id,
      teamId: collaborator.teamId,
      event: "documents.update",
    });
    await View.touch(document.id, collaborator.id, true);

    const processor = new NotificationsProcessor();
    await processor.perform({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
    });
    expect(EmailTask.schedule).not.toHaveBeenCalled();
  });

  test("should not send a notification to last editor", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      lastModifiedById: user.id,
    });
    await NotificationSetting.create({
      userId: user.id,
      teamId: user.teamId,
      event: "documents.update",
    });
    const processor = new NotificationsProcessor();
    await processor.perform({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
    });
    expect(EmailTask.schedule).not.toHaveBeenCalled();
  });
});
