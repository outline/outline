import { CollectionPermission } from "@shared/types";
import { AuthenticationType } from "@server/types";
import {
  buildCollection,
  buildDocument,
  buildGroup,
  buildGroupUser,
  buildNotification,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import RevokeUserNotificationsTask from "../tasks/RevokeUserNotificationsTask";
import NotificationsRevokeProcessor from "./NotificationsRevokeProcessor";

describe("NotificationsRevokeProcessor", () => {
  const schedule = vi
    .spyOn(RevokeUserNotificationsTask.prototype, "schedule")
    .mockResolvedValue(undefined as never);

  beforeEach(() => {
    schedule.mockClear();
  });

  it("should schedule a check for the removed user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });

    await new NotificationsRevokeProcessor().perform({
      name: "collections.remove_user",
      userId: user.id,
      modelId: collection.id,
      collectionId: collection.id,
      teamId: team.id,
      actorId: user.id,
      ip: "127.0.0.1",
      authType: AuthenticationType.APP,
      data: {},
    });

    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        collectionId: collection.id,
      })
    );
  });

  it("should schedule a check for every member of a removed group", async () => {
    const team = await buildTeam();
    const group = await buildGroup({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id });
    const [first, second] = await Promise.all([
      buildUser({ teamId: team.id }),
      buildUser({ teamId: team.id }),
    ]);
    await buildGroupUser({
      teamId: team.id,
      groupId: group.id,
      userId: first.id,
    });
    await buildGroupUser({
      teamId: team.id,
      groupId: group.id,
      userId: second.id,
    });

    await new NotificationsRevokeProcessor().perform({
      name: "documents.remove_group",
      modelId: group.id,
      documentId: document.id,
      teamId: team.id,
      actorId: first.id,
      ip: "127.0.0.1",
      data: { membershipId: "membership" },
    });

    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ userId: first.id, documentId: document.id })
    );
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ userId: second.id, documentId: document.id })
    );
  });

  it("should schedule a scope-less check for a user removed from a group", async () => {
    const team = await buildTeam();
    const group = await buildGroup({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });

    await new NotificationsRevokeProcessor().perform({
      name: "groups.remove_user",
      userId: user.id,
      modelId: group.id,
      teamId: team.id,
      actorId: user.id,
      ip: "127.0.0.1",
    });

    expect(schedule).toHaveBeenCalledWith({ userId: user.id });
  });

  it("should schedule a scope-less check for every member of a deleted group", async () => {
    const team = await buildTeam();
    const group = await buildGroup({ teamId: team.id });
    const [first, second] = await Promise.all([
      buildUser({ teamId: team.id }),
      buildUser({ teamId: team.id }),
    ]);
    await buildGroupUser({
      teamId: team.id,
      groupId: group.id,
      userId: first.id,
    });
    await buildGroupUser({
      teamId: team.id,
      groupId: group.id,
      userId: second.id,
    });
    await group.destroy();

    await new NotificationsRevokeProcessor().perform({
      name: "groups.delete",
      modelId: group.id,
      teamId: team.id,
      actorId: first.id,
      ip: "127.0.0.1",
    });

    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledWith({ userId: first.id });
    expect(schedule).toHaveBeenCalledWith({ userId: second.id });
  });

  it("should schedule a check for every notified user when a collection becomes private", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const other = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.Read,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    await buildNotification({
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
    });
    await buildNotification({
      teamId: team.id,
      userId: other.id,
      collectionId: collection.id,
    });

    await new NotificationsRevokeProcessor().perform({
      name: "collections.permission_changed",
      collectionId: collection.id,
      teamId: team.id,
      actorId: user.id,
      ip: "127.0.0.1",
    });

    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id, collectionId: collection.id })
    );
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ userId: other.id, collectionId: collection.id })
    );
  });

  it("should schedule a check for every recipient when a document is moved", async () => {
    const team = await buildTeam();
    const actor = await buildUser({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const [first, second] = await Promise.all([
      buildUser({ teamId: team.id }),
      buildUser({ teamId: team.id }),
    ]);
    await Promise.all([
      buildNotification({
        teamId: team.id,
        userId: first.id,
        documentId: document.id,
      }),
      buildNotification({
        teamId: team.id,
        userId: second.id,
        documentId: document.id,
      }),
    ]);

    await new NotificationsRevokeProcessor().perform({
      name: "documents.move",
      documentId: document.id,
      collectionId: collection.id,
      teamId: team.id,
      actorId: actor.id,
      ip: "127.0.0.1",
      authType: AuthenticationType.APP,
      data: {
        collectionIds: [collection.id],
        documentIds: [document.id],
      },
    });

    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: first.id,
        documentId: document.id,
      })
    );
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: second.id,
        documentId: document.id,
      })
    );
  });
});
