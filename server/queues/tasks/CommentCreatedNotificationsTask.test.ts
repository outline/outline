import { NotificationEventType } from "@shared/types";
import { Comment, Notification, Subscription } from "@server/models";
import {
  buildComment,
  buildDocument,
  buildSubscription,
  buildUser,
} from "@server/test/factories";
import CommentCreatedNotificationsTask from "./CommentCreatedNotificationsTask";

const ip = "127.0.0.1";

beforeEach(async () => {
  vi.resetAllMocks();
});

describe("CommentCreatedNotificationsTask", () => {
  it("notifies a subscribed team member about a guest comment", async () => {
    const author = await buildUser();
    const document = await buildDocument({
      userId: author.id,
      teamId: author.teamId,
    });
    const recipient = await buildUser({ teamId: author.teamId });
    await buildSubscription({
      userId: recipient.id,
      documentId: document.id,
    });

    const comment = await Comment.create({
      documentId: document.id,
      guestName: "Visitor",
      isPublic: true,
      data: { type: "doc", content: [] },
    });

    const spy = vi.spyOn(Notification, "create");

    const task = new CommentCreatedNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: document.id,
      teamId: author.teamId,
      actorId: undefined as unknown as string,
      ip,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NotificationEventType.CreateComment,
        userId: recipient.id,
        actorId: null,
        commentId: comment.id,
        documentId: document.id,
      }),
      expect.anything()
    );

    // No account to subscribe on behalf of a guest.
    expect(
      await Subscription.count({
        where: { documentId: document.id },
      })
    ).toEqual(1);
  });

  it("still subscribes and notifies for a comment left by a team member", async () => {
    const author = await buildUser();
    const document = await buildDocument({
      userId: author.id,
      teamId: author.teamId,
    });
    const recipient = await buildUser({ teamId: author.teamId });
    await buildSubscription({
      userId: recipient.id,
      documentId: document.id,
    });

    const comment = await buildComment({
      userId: author.id,
      documentId: document.id,
    });

    const spy = vi.spyOn(Notification, "create");

    const task = new CommentCreatedNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: document.id,
      teamId: author.teamId,
      actorId: author.id,
      ip,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NotificationEventType.CreateComment,
        userId: recipient.id,
        actorId: author.id,
        commentId: comment.id,
        documentId: document.id,
      }),
      expect.anything()
    );

    expect(
      await Subscription.count({
        where: { documentId: document.id, userId: author.id },
      })
    ).toEqual(1);
  });
});
