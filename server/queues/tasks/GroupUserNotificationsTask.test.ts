import { NotificationEventType } from "@shared/types";
import { Event, Notification } from "@server/models";
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

  it("should delete an unread removal notification when the user is added back", async () => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    const group = await buildGroup({ teamId: actor.teamId });
    const props = {
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    };

    await new GroupUserNotificationsTask().perform({
      ...props,
      name: "groups.remove_user",
    });
    const removal = await Notification.findOne({
      where: { userId: user.id },
    });
    await new GroupUserNotificationsTask().perform({
      ...props,
      name: "groups.add_user",
    });

    const notifications = await Notification.findAll({
      where: { userId: user.id },
    });
    expect(notifications.map((n) => n.event)).toEqual([
      NotificationEventType.AddUserToGroup,
    ]);

    const deleteEvent = await Event.findOne({
      where: { name: "notifications.delete", modelId: removal!.id },
    });
    expect(deleteEvent?.userId).toEqual(user.id);
  });

  it("should delete an unread addition notification when the user is removed", async () => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    const group = await buildGroup({ teamId: actor.teamId });
    const props = {
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    };

    await new GroupUserNotificationsTask().perform({
      ...props,
      name: "groups.add_user",
    });
    await new GroupUserNotificationsTask().perform({
      ...props,
      name: "groups.remove_user",
    });

    const notifications = await Notification.findAll({
      where: { userId: user.id },
    });
    expect(notifications.map((n) => n.event)).toEqual([
      NotificationEventType.RemoveUserFromGroup,
    ]);
  });

  it("should keep a read notification when the membership changes again", async () => {
    const actor = await buildUser();
    const user = await buildUser({ teamId: actor.teamId });
    const group = await buildGroup({ teamId: actor.teamId });
    const props = {
      userId: user.id,
      modelId: group.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
    };

    await new GroupUserNotificationsTask().perform({
      ...props,
      name: "groups.add_user",
    });
    await Notification.update(
      { viewedAt: new Date() },
      { where: { userId: user.id } }
    );
    await new GroupUserNotificationsTask().perform({
      ...props,
      name: "groups.remove_user",
    });

    const count = await Notification.count({ where: { userId: user.id } });
    expect(count).toEqual(2);
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
