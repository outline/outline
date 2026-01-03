import { NotificationEventType } from "@shared/types";
import { Notification } from "@server/models";
import {
  buildUser,
  buildDocument,
  buildGroup,
  buildGroupUser,
  buildComment,
} from "@server/test/factories";
import GroupMentionedInCommentNotificationsTask from "./GroupMentionedInCommentNotificationsTask";

const ip = "127.0.0.1";

beforeEach(async () => {
  jest.resetAllMocks();
});

describe("GroupMentionedInCommentNotificationsTask", () => {
  it("should send notifications to all group members with access", async () => {
    const spy = jest.spyOn(Notification, "create");
    const actor = await buildUser();
    const document = await buildDocument({
      teamId: actor.teamId,
    });
    const comment = await buildComment({
      userId: actor.id,
      documentId: document.id,
    });

    const group = await buildGroup({
      teamId: actor.teamId,
    });

    const member1 = await buildUser({ teamId: actor.teamId });
    const member2 = await buildUser({ teamId: actor.teamId });

    await buildGroupUser({
      groupId: group.id,
      userId: member1.id,
    });
    await buildGroupUser({
      groupId: group.id,
      userId: member2.id,
    });

    member1.setNotificationEventType(
      NotificationEventType.GroupMentionedInComment
    );
    await member1.save();

    member2.setNotificationEventType(
      NotificationEventType.GroupMentionedInComment
    );
    await member2.save();

    const task = new GroupMentionedInCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
      data: {
        groupId: group.id,
        actorId: actor.id,
      },
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NotificationEventType.GroupMentionedInComment,
        groupId: group.id,
        userId: member1.id,
        actorId: actor.id,
        documentId: document.id,
        commentId: comment.id,
      })
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NotificationEventType.GroupMentionedInComment,
        groupId: group.id,
        userId: member2.id,
        actorId: actor.id,
        documentId: document.id,
        commentId: comment.id,
      })
    );
  });

  it("should not send notification to actor", async () => {
    const spy = jest.spyOn(Notification, "create");
    const actor = await buildUser();
    const document = await buildDocument({
      teamId: actor.teamId,
    });
    const comment = await buildComment({
      userId: actor.id,
      documentId: document.id,
    });

    const group = await buildGroup({
      teamId: actor.teamId,
    });

    await buildGroupUser({
      groupId: group.id,
      userId: actor.id,
    });

    actor.setNotificationEventType(
      NotificationEventType.GroupMentionedInComment
    );
    await actor.save();

    const task = new GroupMentionedInCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
      data: {
        groupId: group.id,
        actorId: actor.id,
      },
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not send notification if group has mentions disabled", async () => {
    const spy = jest.spyOn(Notification, "create");
    const actor = await buildUser();
    const document = await buildDocument({
      teamId: actor.teamId,
    });
    const comment = await buildComment({
      userId: actor.id,
      documentId: document.id,
    });

    const group = await buildGroup({
      teamId: actor.teamId,
      disableMentions: true,
    });

    const member = await buildUser({ teamId: actor.teamId });
    await buildGroupUser({
      groupId: group.id,
      userId: member.id,
    });

    member.setNotificationEventType(
      NotificationEventType.GroupMentionedInComment
    );
    await member.save();

    const task = new GroupMentionedInCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
      data: {
        groupId: group.id,
        actorId: actor.id,
      },
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not send notification to users without subscription", async () => {
    const spy = jest.spyOn(Notification, "create");
    const actor = await buildUser();
    const document = await buildDocument({
      teamId: actor.teamId,
    });
    const comment = await buildComment({
      userId: actor.id,
      documentId: document.id,
    });

    const group = await buildGroup({
      teamId: actor.teamId,
    });

    const member = await buildUser({ teamId: actor.teamId });
    await buildGroupUser({
      groupId: group.id,
      userId: member.id,
    });

    // member doesn't have notification subscription enabled
    member.setNotificationEventType(
      NotificationEventType.GroupMentionedInComment,
      false
    );
    await member.save();

    const task = new GroupMentionedInCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
      data: {
        groupId: group.id,
        actorId: actor.id,
      },
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should handle large groups with batching", async () => {
    const spy = jest.spyOn(Notification, "create");
    const actor = await buildUser();
    const document = await buildDocument({
      teamId: actor.teamId,
    });
    const comment = await buildComment({
      userId: actor.id,
      documentId: document.id,
    });

    const group = await buildGroup({
      teamId: actor.teamId,
    });

    // Create 25 members to test batching (batch size is 10)
    const members = [];
    for (let i = 0; i < 25; i++) {
      const member = await buildUser({ teamId: actor.teamId });
      await buildGroupUser({
        groupId: group.id,
        userId: member.id,
      });
      member.setNotificationEventType(
        NotificationEventType.GroupMentionedInComment
      );
      await member.save();
      members.push(member);
    }

    const task = new GroupMentionedInCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: document.id,
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
      data: {
        groupId: group.id,
        actorId: actor.id,
      },
    });

    expect(spy).toHaveBeenCalledTimes(25);
  });

  it("should not send notification if document does not exist", async () => {
    const spy = jest.spyOn(Notification, "create");
    const actor = await buildUser();
    const document = await buildDocument({
      teamId: actor.teamId,
    });
    const comment = await buildComment({
      userId: actor.id,
      documentId: document.id,
    });

    const group = await buildGroup({
      teamId: actor.teamId,
    });

    const member = await buildUser({ teamId: actor.teamId });
    await buildGroupUser({
      groupId: group.id,
      userId: member.id,
    });

    member.setNotificationEventType(
      NotificationEventType.GroupMentionedInComment
    );
    await member.save();

    const task = new GroupMentionedInCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: "non-existent-id",
      teamId: actor.teamId,
      actorId: actor.id,
      ip,
      data: {
        groupId: group.id,
        actorId: actor.id,
      },
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
