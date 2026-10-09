import { NotificationEventType } from "@shared/types";
import { Notification } from "@server/models";
import { buildGroup, buildUser } from "@server/test/factories";
import GroupUserNotificationsTask from "./GroupUserNotificationsTask";

const ip = "127.0.0.1";

describe("GroupUserNotificationsTask", () => {
  it("should notify a user added to a group", async () => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    const group = await buildGroup({ teamId: actor.teamId });

    await new GroupUserNotificationsTask().perform({
      name: "groups.add_user",
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    const notifications = await Notification.findAll({
      where: { userId: user.id },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].event).toEqual(
      NotificationEventType.AddUserToGroup
    );
    expect(notifications[0].groupId).toEqual(group.id);
    expect(notifications[0].actorId).toEqual(actor.id);
  });

  it("should notify a user removed from a group", async () => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    const group = await buildGroup({ teamId: actor.teamId });

    await new GroupUserNotificationsTask().perform({
      name: "groups.remove_user",
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    const notifications = await Notification.findAll({
      where: { userId: user.id },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].event).toEqual(
      NotificationEventType.RemoveUserFromGroup
    );
    expect(notifications[0].groupId).toEqual(group.id);
  });

  it("should not notify a user when the group is externally managed", async () => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    const group = await buildGroup({
      teamId: actor.teamId,
      externalId: "ext-1",
    });

    await new GroupUserNotificationsTask().perform({
      name: "groups.add_user",
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    const count = await Notification.count({ where: { userId: user.id } });
    expect(count).toEqual(0);
  });

  it("should not notify a removed user that is unsubscribed", async () => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    user.setNotificationEventType(NotificationEventType.AddUserToGroup, false);
    await user.save();
    const group = await buildGroup({ teamId: actor.teamId });

    await new GroupUserNotificationsTask().perform({
      name: "groups.remove_user",
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    const count = await Notification.count({ where: { userId: user.id } });
    expect(count).toEqual(0);
  });

  it("should not notify a user that is unsubscribed", async () => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    user.setNotificationEventType(NotificationEventType.AddUserToGroup, false);
    await user.save();
    const group = await buildGroup({ teamId: actor.teamId });

    await new GroupUserNotificationsTask().perform({
      name: "groups.add_user",
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    const count = await Notification.count({ where: { userId: user.id } });
    expect(count).toEqual(0);
  });

  it("should not notify a suspended user", async () => {
    const actor = await buildUser();
    const user = await buildUser({
      teamId: actor.teamId,
      suspendedAt: new Date(),
    });
    const group = await buildGroup({ teamId: actor.teamId });

    await new GroupUserNotificationsTask().perform({
      name: "groups.remove_user",
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    });

    const count = await Notification.count({ where: { userId: user.id } });
    expect(count).toEqual(0);
  });
});
