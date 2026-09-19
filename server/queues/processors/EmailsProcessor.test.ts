import { NotificationEventType } from "@shared/types";
import CommentCreatedEmail from "@server/emails/templates/CommentCreatedEmail";
import { Comment } from "@server/models";
import {
  buildComment,
  buildDocument,
  buildNotification,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import EmailsProcessor from "./EmailsProcessor";

describe("EmailsProcessor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the actor's name for a comment left by a team member", async () => {
    const author = await buildUser();
    const document = await buildDocument({
      userId: author.id,
      teamId: author.teamId,
    });
    const comment = await buildComment({
      userId: author.id,
      documentId: document.id,
    });
    const recipient = await buildUser({ teamId: author.teamId });
    const notification = await buildNotification({
      event: NotificationEventType.CreateComment,
      userId: recipient.id,
      teamId: author.teamId,
      actorId: author.id,
      documentId: document.id,
      commentId: comment.id,
    });

    const findByPkSpy = vi.spyOn(Comment, "findByPk");
    const scheduleSpy = vi
      .spyOn(CommentCreatedEmail.prototype, "schedule")
      .mockReturnValue(undefined as never);

    await new EmailsProcessor().perform({
      name: "notifications.create",
      modelId: notification.id,
      teamId: author.teamId,
      userId: recipient.id,
      actorId: author.id,
      ip: "127.0.0.1",
    });

    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    // The actor is already known, so the guest-name fallback lookup for the
    // comment is never needed.
    expect(findByPkSpy).not.toHaveBeenCalled();
  });

  it("falls back to the comment's guest name for a comment left by a public visitor, instead of throwing on a null actor", async () => {
    const team = await buildTeam();
    const document = await buildDocument({ teamId: team.id });
    const comment = await Comment.create({
      documentId: document.id,
      guestName: "Visitor",
      isPublic: true,
      data: { type: "doc", content: [] },
    });
    const recipient = await buildUser({ teamId: team.id });
    const notification = await buildNotification({
      event: NotificationEventType.CreateComment,
      userId: recipient.id,
      teamId: team.id,
      documentId: document.id,
      commentId: comment.id,
    });

    const scheduleSpy = vi
      .spyOn(CommentCreatedEmail.prototype, "schedule")
      .mockReturnValue(undefined as never);

    await expect(
      new EmailsProcessor().perform({
        name: "notifications.create",
        modelId: notification.id,
        teamId: team.id,
        userId: recipient.id,
        actorId: undefined as unknown as string,
        ip: "127.0.0.1",
      })
    ).resolves.not.toThrow();

    expect(scheduleSpy).toHaveBeenCalledTimes(1);
  });
});
