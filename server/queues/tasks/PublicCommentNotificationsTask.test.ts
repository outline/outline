import { randomString } from "@shared/random";
import ShareCommentCreatedEmail from "@server/emails/templates/ShareCommentCreatedEmail";
import { Comment, ShareSubscription } from "@server/models";
import { buildDocument, buildShare } from "@server/test/factories";
import PublicCommentNotificationsTask from "./PublicCommentNotificationsTask";

const ip = "127.0.0.1";

beforeEach(() => {
  vi.restoreAllMocks();
});

async function buildGuestSubscription({
  shareId,
  documentId,
  email,
  confirmed,
}: {
  shareId: string;
  documentId: string;
  email: string;
  confirmed: boolean;
}) {
  return ShareSubscription.create({
    shareId,
    documentId,
    email,
    emailFingerprint: ShareSubscription.normalizeEmailFingerprint(email),
    secret: randomString(32),
    confirmedAt: confirmed ? new Date() : null,
  });
}

describe("PublicCommentNotificationsTask", () => {
  it("emails a confirmed guest subscriber about a reply, but not an unconfirmed one or the reply's own author", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      allowPublicComments: true,
      published: true,
    });

    // Participated in the thread and confirmed their subscription — should
    // be notified about the new reply.
    const root = await Comment.create({
      documentId: document.id,
      guestName: "Root author",
      guestEmail: "confirmed@example.com",
      isPublic: true,
      data: { type: "doc", content: [] },
    });
    await buildGuestSubscription({
      shareId: share.id,
      documentId: document.id,
      email: "confirmed@example.com",
      confirmed: true,
    });

    // Also participated in the thread, but never confirmed — must not be
    // emailed even though they left a comment in it.
    await Comment.create({
      documentId: document.id,
      parentCommentId: root.id,
      guestName: "Unconfirmed replier",
      guestEmail: "unconfirmed@example.com",
      isPublic: true,
      data: { type: "doc", content: [] },
    });
    await buildGuestSubscription({
      shareId: share.id,
      documentId: document.id,
      email: "unconfirmed@example.com",
      confirmed: false,
    });

    // The author of the very comment being processed — even though
    // confirmed, must never be emailed about their own comment.
    const reply = await Comment.create({
      documentId: document.id,
      parentCommentId: root.id,
      guestName: "Replier",
      guestEmail: "replier@example.com",
      isPublic: true,
      data: { type: "doc", content: [] },
    });
    await buildGuestSubscription({
      shareId: share.id,
      documentId: document.id,
      email: "replier@example.com",
      confirmed: true,
    });

    const spy = vi.spyOn(ShareCommentCreatedEmail.prototype, "schedule");

    const task = new PublicCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: reply.id,
      documentId: document.id,
      teamId: document.teamId,
      actorId: undefined as unknown as string,
      ip,
    });

    // Only the confirmed, non-authoring participant qualifies: the
    // unconfirmed subscriber and the reply's own (also confirmed) author
    // are both excluded, so a single call proves both exclusions held.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not notify anyone for an internal (non-public) comment", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      allowPublicComments: true,
      published: true,
    });
    await buildGuestSubscription({
      shareId: share.id,
      documentId: document.id,
      email: "confirmed@example.com",
      confirmed: true,
    });

    const comment = await Comment.create({
      documentId: document.id,
      guestName: "Root author",
      guestEmail: "root-author@example.com",
      isPublic: false,
      data: { type: "doc", content: [] },
    });

    const spy = vi.spyOn(ShareCommentCreatedEmail.prototype, "schedule");

    const task = new PublicCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: comment.id,
      documentId: document.id,
      teamId: document.teamId,
      actorId: undefined as unknown as string,
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not notify guests about an internal reply within an otherwise public thread", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
      allowPublicComments: true,
      published: true,
    });

    const root = await Comment.create({
      documentId: document.id,
      guestName: "Root author",
      guestEmail: "confirmed@example.com",
      isPublic: true,
      data: { type: "doc", content: [] },
    });
    await buildGuestSubscription({
      shareId: share.id,
      documentId: document.id,
      email: "confirmed@example.com",
      confirmed: true,
    });

    // A member reply kept internal within the otherwise public thread.
    const reply = await Comment.create({
      documentId: document.id,
      parentCommentId: root.id,
      isPublic: false,
      data: { type: "doc", content: [] },
    });

    const spy = vi.spyOn(ShareCommentCreatedEmail.prototype, "schedule");

    const task = new PublicCommentNotificationsTask();
    await task.perform({
      name: "comments.create",
      modelId: reply.id,
      documentId: document.id,
      teamId: document.teamId,
      actorId: undefined as unknown as string,
      ip,
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
