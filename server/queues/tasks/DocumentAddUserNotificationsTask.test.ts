import { DocumentPermission, NotificationEventType } from "@shared/types";
import { Notification, UserMembership } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import DocumentAddUserNotificationsTask from "./DocumentAddUserNotificationsTask";

const ip = "127.0.0.1";

describe("DocumentAddUserNotificationsTask", () => {
  const perform = async (ownerIds: (userId: string) => string[]) => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    const collection = await buildCollection({
      teamId: actor.teamId,
      userId: actor.id,
      permission: null,
    });
    const document = await buildDocument({
      userId: actor.id,
      teamId: actor.teamId,
      collectionId: collection.id,
      ownerIds: ownerIds(user.id),
    });
    const membership = await UserMembership.create({
      documentId: document.id,
      userId: user.id,
      createdById: actor.id,
      permission: DocumentPermission.Admin,
    });

    await new DocumentAddUserNotificationsTask().perform({
      name: "documents.add_user",
      userId: user.id,
      modelId: membership.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
      changes: {
        attributes: { permission: DocumentPermission.Admin },
        previous: {},
      },
    });

    return Notification.count({
      where: {
        userId: user.id,
        event: NotificationEventType.AddUserToDocument,
      },
    });
  };

  it("should notify a user added to a document", async () => {
    expect(await perform(() => [])).toBe(1);
  });

  it("should not notify a user that is an owner of the document", async () => {
    expect(await perform((userId) => [userId])).toBe(0);
  });
});
