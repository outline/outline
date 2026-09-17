import { CommentingAccess, TeamPreference } from "@shared/types";
import ShareSubscriptionConfirmEmail from "@server/emails/templates/ShareSubscriptionConfirmEmail";
import { Comment, Event, Collection, ShareSubscription } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildComment,
  buildDocument,
  buildShare,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

async function fixture() {
  const user = await buildAdmin();
  const collection = await buildCollection({
    userId: user.id,
    teamId: user.teamId,
  });
  const document = await buildDocument({
    userId: user.id,
    teamId: user.teamId,
    collectionId: collection.id,
    text: "Public anchor and private anchor.",
  });
  const share = await buildShare({
    userId: user.id,
    teamId: user.teamId,
    documentId: document.id,
    allowPublicComments: true,
  });
  const body = {
    shareId: share.id,
    documentId: document.id,
    guestName: "Visitor",
    text: "Feedback",
  };
  return { user, collection, document, share, body };
}

describe("public comment access", () => {
  it.each(["", "   ", "a".repeat(101)])(
    "rejects invalid guest name %j",
    async (guestName) => {
      const { body } = await fixture();
      const response = await server.post("/api/comments.create", {
        body: { ...body, guestName },
      });
      expect(response.status).toBe(400);
    }
  );

  it.each(["disabled", "revoked", "unpublished"])(
    "blocks reading and writing a %s share",
    async (state) => {
      const { share, body } = await fixture();
      await share.update(
        state === "disabled"
          ? { allowPublicComments: false }
          : state === "revoked"
            ? { revokedAt: new Date() }
            : { published: false }
      );
      for (const endpoint of ["list", "create"]) {
        const response = await server.post(`/api/comments.${endpoint}`, {
          body,
        });
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
      expect(
        await Comment.count({ where: { documentId: body.documentId } })
      ).toBe(0);
    }
  );

  it("does not authorize another document through a valid share", async () => {
    const { user, body } = await fixture();
    const other = await buildDocument({ userId: user.id, teamId: user.teamId });
    for (const endpoint of ["list", "create"]) {
      const response = await server.post(`/api/comments.${endpoint}`, {
        body: { ...body, documentId: other.id },
      });
      expect(response.status).toBe(403);
    }
  });

  it("respects the team commenting switch for public and internal reads", async () => {
    const { user, body } = await fixture();
    await user.team.update({
      preferences: {
        ...user.team.preferences,
        [TeamPreference.Commenting]: CommentingAccess.None,
      },
    });
    expect((await server.post("/api/comments.list", { body })).status).toBe(
      400
    );
    expect((await server.post("/api/comments.create", { body })).status).toBe(
      400
    );
    expect(
      (
        await server.post("/api/comments.list", user, {
          body: { documentId: body.documentId },
        })
      ).status
    ).toBe(400);
  });

  it("never allows public replies into an internal thread", async () => {
    const { user, body } = await fixture();
    const internal = await buildComment({
      userId: user.id,
      documentId: body.documentId,
    });
    const response = await server.post("/api/comments.create", {
      body: { ...body, parentCommentId: internal.id },
    });
    expect(response.status).toBe(400);
  });

  it("lets a member reply stay internal within a public thread, and rejects nested replies", async () => {
    const { user, body } = await fixture();
    const root = await buildComment({
      userId: user.id,
      documentId: body.documentId,
      isPublic: true,
    });
    const response = await server.post("/api/comments.create", user, {
      body: {
        documentId: body.documentId,
        text: "Reply",
        parentCommentId: root.id,
        isPublic: false,
      },
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.isPublic).toBe(false);
    const nested = await server.post("/api/comments.create", {
      body: { ...body, parentCommentId: data.id },
    });
    expect(nested.status).toBe(400);
  });

  it("defaults a member reply to public within a public thread when isPublic is omitted", async () => {
    const { user, body } = await fixture();
    const root = await buildComment({
      userId: user.id,
      documentId: body.documentId,
      isPublic: true,
    });
    const response = await server.post("/api/comments.create", user, {
      body: {
        documentId: body.documentId,
        text: "Reply",
        parentCommentId: root.id,
      },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).data.isPublic).toBe(true);
  });

  it("forces a member reply to stay internal within an internal thread even when isPublic is true", async () => {
    const { user, body } = await fixture();
    const root = await buildComment({
      userId: user.id,
      documentId: body.documentId,
      isPublic: false,
    });
    const response = await server.post("/api/comments.create", user, {
      body: {
        documentId: body.documentId,
        text: "Reply",
        parentCommentId: root.id,
        isPublic: true,
      },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).data.isPublic).toBe(false);
  });

  it("always makes a guest reply public, regardless of the isPublic field", async () => {
    const { user, body } = await fixture();
    const root = await buildComment({
      userId: user.id,
      documentId: body.documentId,
      isPublic: true,
    });
    const response = await server.post("/api/comments.create", {
      body: { ...body, parentCommentId: root.id },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).data.isPublic).toBe(true);
  });

  it("excludes internal replies of a public thread from the guest listing", async () => {
    const { user, body } = await fixture();
    const root = await buildComment({
      userId: user.id,
      documentId: body.documentId,
      isPublic: true,
    });
    await buildComment({
      userId: user.id,
      documentId: body.documentId,
      parentCommentId: root.id,
      isPublic: false,
    });
    const publicReply = await buildComment({
      userId: user.id,
      documentId: body.documentId,
      parentCommentId: root.id,
      isPublic: true,
    });
    const response = await server.post("/api/comments.list", {
      body: { ...body, parentCommentId: root.id },
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.map((comment: { id: string }) => comment.id)).toEqual([
      publicReply.id,
    ]);
  });

  it("creates a guest event in the document team even for a visitor logged into another team", async () => {
    const { user, body } = await fixture();
    const outsider = await buildUser();
    const response = await server.post("/api/comments.create", outsider, {
      body,
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    const event = await Event.findOne({
      where: { modelId: data.id, name: "comments.create" },
      rejectOnEmpty: true,
    });
    expect(event.teamId).toBe(user.teamId);
    expect(event.actorId).toBeNull();
    expect(data.isGuest).toBe(true);
    expect(data.createdBy).toBeNull();
    expect(data.createdById).toBeNull();
    expect(data.guestName).toBe(body.guestName);
  });

  it("allows an authorized administrator to read, resolve and delete guest comments", async () => {
    const { user, body } = await fixture();
    const response = await server.post("/api/comments.create", { body });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    const outsider = await buildAdmin();
    expect(
      (
        await server.post("/api/comments.delete", outsider, {
          body: { id: data.id },
        })
      ).status
    ).toBe(403);
    for (const endpoint of ["info", "resolve", "delete"]) {
      expect(
        (
          await server.post(`/api/comments.${endpoint}`, user, {
            body: { id: data.id },
          })
        ).status
      ).toBe(200);
    }
  });

  it("keeps existing comments internal and permits choosing public visibility while the share switch is off", async () => {
    const { user, share, body } = await fixture();
    await share.update({ allowPublicComments: false });
    const internal = await server.post("/api/comments.create", user, {
      body: { documentId: body.documentId, text: "Internal" },
    });
    expect((await internal.json()).data.isPublic).toBe(false);
    const external = await server.post("/api/comments.create", user, {
      body: { documentId: body.documentId, text: "Public", isPublic: true },
    });
    expect(external.status).toBe(200);
    expect((await external.json()).data.isPublic).toBe(true);
  });

  it("supports public comments on a child document included in a parent share", async () => {
    const { user, collection, document, share, body } = await fixture();
    await share.update({ includeChildDocuments: true });
    const child = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      parentDocumentId: document.id,
    });
    const structured = await Collection.findByPk(collection.id, {
      includeDocumentStructure: true,
      rejectOnEmpty: true,
    });
    await structured.addDocumentToStructure(child, 0);
    const memberResponse = await server.post("/api/comments.create", user, {
      body: { documentId: child.id, text: "Member feedback", isPublic: true },
    });
    expect(memberResponse.status).toBe(200);
    expect(
      (
        await server.post("/api/comments.create", {
          body: { ...body, documentId: child.id },
        })
      ).status
    ).toBe(200);
    const response = await server.post("/api/comments.list", {
      body: { ...body, documentId: child.id },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toHaveLength(2);
  });

  it("exposes only public inline anchors, preserving their position after reload", async () => {
    const { user, document, share, body } = await fixture();
    const internal = await server.post("/api/comments.create", user, {
      body: {
        documentId: document.id,
        text: "Private",
        anchorText: "private anchor",
      },
    });
    expect(internal.status).toBe(200);
    const internalId = (await internal.json()).data.id;
    const external = await server.post("/api/comments.create", {
      body: { ...body, anchorText: "Public anchor" },
    });
    expect(external.status).toBe(200);
    const publicId = (await external.json()).data.id;
    for (const member of [undefined, user]) {
      const response = member
        ? await server.post("/api/documents.info", member, {
            body: { id: document.id, shareId: share.id },
            headers: { "x-api-version": "3" },
          })
        : await server.post("/api/documents.info", {
            body: { id: document.id, shareId: share.id },
            headers: { "x-api-version": "3" },
          });
      expect(response.status).toBe(200);
      const result = await response.json();
      const content = JSON.stringify(result.data.document.data);
      expect(content).toContain(publicId);
      expect(content).not.toContain(internalId);
    }
    await share.update({ allowPublicComments: false });
    const response = await server.post("/api/documents.info", {
      body: { id: document.id, shareId: share.id },
      headers: { "x-api-version": "3" },
    });
    expect(
      JSON.stringify((await response.json()).data.document.data)
    ).not.toContain(publicId);
  });

  it("lets any team member with commenting rights delete, but not edit, a guest comment", async () => {
    const { user, body } = await fixture();
    const created = await server.post("/api/comments.create", { body });
    const { data } = await created.json();

    const member = await buildUser({ teamId: user.teamId });

    const editAttempt = await server.post("/api/comments.update", member, {
      body: {
        id: data.id,
        data: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Edited" }] },
          ],
        },
      },
    });
    expect(editAttempt.status).toBe(403);

    const deleteAttempt = await server.post("/api/comments.delete", member, {
      body: { id: data.id },
    });
    expect(deleteAttempt.status).toBe(200);
    expect(await Comment.findByPk(data.id)).toBeNull();
  });

  it("rejects a mention node in a public comment", async () => {
    const { body } = await fixture();
    const response = await server.post("/api/comments.create", {
      body: {
        ...body,
        text: undefined,
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "mention",
                  attrs: {
                    id: "mention-1",
                    type: "user",
                    modelId: "some-user-id",
                    actorId: "some-actor-id",
                    label: "Someone",
                  },
                },
              ],
            },
          ],
        },
      },
    });
    expect(response.status).toBe(400);
    expect(
      await Comment.count({ where: { documentId: body.documentId } })
    ).toBe(0);
  });
});

describe("public comment guest email subscription", () => {
  // ShareSubscription enforces a small per-IP limit on distinct email
  // addresses (see ShareSubscription.maxSubscriptionsPerIP) to deter abuse.
  // Test requests all originate from the same loopback address, so the
  // fingerprint this block creates is removed once it is no longer needed,
  // to avoid counting against that shared budget for any other test file.
  // The limit is lifted for this block so that residue left in a shared local
  // database by other test files cannot make these expectations flaky; the
  // dedicated test below lowers it again explicitly.
  const originalLimit = ShareSubscription.maxSubscriptionsPerIP;

  beforeAll(() => {
    ShareSubscription.maxSubscriptionsPerIP = Number.MAX_SAFE_INTEGER;
  });

  afterAll(async () => {
    ShareSubscription.maxSubscriptionsPerIP = originalLimit;
    await ShareSubscription.destroy({
      where: {
        emailFingerprint: ShareSubscription.normalizeEmailFingerprint(
          "visitor@example.com"
        ),
      },
    });
  });

  it("creates a share subscription and schedules a confirmation email", async () => {
    const { body } = await fixture();
    const spy = vi.spyOn(ShareSubscriptionConfirmEmail.prototype, "schedule");

    const response = await server.post("/api/comments.create", {
      body: { ...body, guestEmail: "visitor@example.com" },
    });
    expect(response.status).toBe(200);

    const subscription = await ShareSubscription.findOne({
      where: { shareId: body.shareId, documentId: body.documentId },
    });
    expect(subscription).not.toBeNull();
    expect(subscription!.email).toBe("visitor@example.com");
    expect(subscription!.isConfirmed).toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it("still posts the comment when the per-IP subscription limit is reached", async () => {
    const { body } = await fixture();
    const liftedLimit = ShareSubscription.maxSubscriptionsPerIP;
    ShareSubscription.maxSubscriptionsPerIP = 0;

    try {
      const response = await server.post("/api/comments.create", {
        body: { ...body, guestEmail: "visitor@example.com" },
      });
      expect(response.status).toBe(200);

      const { data } = await response.json();
      expect(
        await Comment.count({
          where: { id: data.id, documentId: body.documentId },
        })
      ).toBe(1);
      expect(
        await ShareSubscription.count({
          where: { shareId: body.shareId, documentId: body.documentId },
        })
      ).toBe(0);
    } finally {
      ShareSubscription.maxSubscriptionsPerIP = liftedLimit;
    }
  });

  it("does not duplicate the subscription for a second comment from the same email", async () => {
    const { body } = await fixture();

    await server.post("/api/comments.create", {
      body: { ...body, guestEmail: "visitor@example.com" },
    });
    await server.post("/api/comments.create", {
      body: { ...body, guestEmail: "visitor@example.com" },
    });

    expect(
      await ShareSubscription.count({
        where: { shareId: body.shareId, documentId: body.documentId },
      })
    ).toBe(1);
  });

  it("never returns the guest email in the comment payload", async () => {
    const { body } = await fixture();
    const created = await server.post("/api/comments.create", {
      body: { ...body, guestEmail: "visitor@example.com" },
    });
    const { data } = await created.json();
    expect(data.guestEmail).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain("visitor@example.com");

    const listed = await server.post("/api/comments.list", { body });
    const { data: listedComments } = await listed.json();
    expect(JSON.stringify(listedComments)).not.toContain("visitor@example.com");
  });

  it("ignores the guest email on an authenticated, non-share request", async () => {
    const { user, document } = await fixture();
    const response = await server.post("/api/comments.create", user, {
      body: {
        documentId: document.id,
        text: "Internal comment",
        guestEmail: "member@example.com",
      },
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.guestEmail).toBeUndefined();

    expect(
      await ShareSubscription.count({
        where: { documentId: document.id },
      })
    ).toBe(0);
  });
});
