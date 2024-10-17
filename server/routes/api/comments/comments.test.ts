import { CommentStatusFilter, Reaction as TReaction } from "@shared/types";
import { Reaction } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildComment,
  buildDocument,
  buildResolvedComment,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#comments.info", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.info");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return comment info", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const user2 = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user2.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.info", {
      body: {
        token: user.getJwtToken(),
        id: comment.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(comment.id);
    expect(body.data.data).toEqual(comment.data);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.update).toEqual(false);
    expect(body.policies[0].abilities.delete).toEqual(false);
  });

  it("should return comment info for admin", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const user2 = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user2.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.info", {
      body: {
        token: user.getJwtToken(),
        id: comment.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(comment.id);
    expect(body.data.data).toEqual(comment.data);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.update).toBeTruthy();
    expect(body.policies[0].abilities.delete).toBeTruthy();
  });
});

describe("#comments.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return all comments for a document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    await buildResolvedComment(user, {
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[1].id).toEqual(comment.id);
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[1].abilities.read).toBeTruthy();
    expect(body.pagination.total).toEqual(2);
  });

  it("should return unresolved comments for a collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(comment.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.pagination.total).toEqual(1);
  });

  it("should return unresolved comments for a parentCommentId", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    const childComment = await buildComment({
      userId: user.id,
      documentId: document.id,
      parentCommentId: comment.id,
    });
    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
        parentCommentId: comment.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(childComment.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.pagination.total).toEqual(1);
  });

  it("should return resolved comments for a statusFilter", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    const resolved = await buildResolvedComment(user, {
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        statusFilter: [CommentStatusFilter.Resolved],
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(resolved.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.unresolve).toBeTruthy();
    expect(body.policies[0].abilities.resolve).toEqual(false);
    expect(body.pagination.total).toEqual(1);
  });

  it("should return all unresolved comments", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection1 = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const collection2 = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document1 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection1.id,
    });
    const document2 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection2.id,
    });
    const comment1 = await buildComment({
      userId: user.id,
      documentId: document1.id,
    });
    const comment2 = await buildComment({
      userId: user.id,
      documentId: document2.id,
    });
    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect([body.data[0].id, body.data[1].id].sort()).toEqual(
      [comment1.id, comment2.id].sort()
    );
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[1].abilities.read).toBeTruthy();
    expect(body.pagination.total).toEqual(2);
  });

  it("should return reactions for a comment", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const reactions: TReaction[] = [
      { emoji: "😄", userIds: [user.id] },
      { emoji: "🙃", userIds: [user.id] },
    ];
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
      reactions,
    });

    const res = await server.post("/api/comments.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(comment.id);
    expect(body.data[0].reactions).toEqual(reactions);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.pagination.total).toEqual(1);
  });
});

describe("#comments.create", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.create");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should create a comment", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/comments.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        data: comment.data,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.data).toEqual(comment.data);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.update).toBeTruthy();
    expect(body.policies[0].abilities.delete).toBeTruthy();
  });

  it("should not allow empty comment data", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/comments.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        data: null,
      },
    });

    const anotherRes = await server.post("/api/comments.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        data: {
          type: "doc",
          content: [{ type: "paragraph" }],
        },
      },
    });

    expect(res.status).toEqual(400);
    expect(anotherRes.status).toEqual(400);
  });

  it("should not allow comments containing only whitespaces", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/comments.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "  \n\r\n" }],
            },
          ],
        },
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should allow adding images to comments", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/comments.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "image",
                  attrs: {
                    src: "https://example.com/image.png",
                    alt: "Example image",
                  },
                },
              ],
            },
          ],
        },
      },
    });

    expect(res.status).toEqual(200);
  });

  it("should allow adding images from internal sources", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/comments.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "image",
                  attrs: {
                    src: "/api/attachments.redirect?id=1401323b-c4e2-40de-b172-e1668ec89111",
                    alt: null,
                  },
                },
              ],
            },
          ],
        },
      },
    });

    expect(res.status).toEqual(200);
  });

  it("should not allow invalid comment data", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/comments.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        data: {
          type: "nonsense",
        },
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#comments.update", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.update");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should update an existing comment", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/comments.update", {
      body: {
        token: user.getJwtToken(),
        id: comment.id,
        data: comment.data,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.data).toEqual(comment.data);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.update).toBeTruthy();
    expect(body.policies[0].abilities.delete).toBeTruthy();
  });
});

describe("#comments.resolve", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.resolve");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should allow resolving a comment thread", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/comments.resolve", {
      body: {
        token: user.getJwtToken(),
        id: comment.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.resolvedAt).toBeTruthy();
    expect(body.data.resolvedById).toEqual(user.id);
    expect(body.data.resolvedBy.id).toEqual(user.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.update).toBeTruthy();
    expect(body.policies[0].abilities.delete).toBeTruthy();
    expect(body.policies[0].abilities.unresolve).toBeTruthy();
    expect(body.policies[0].abilities.resolve).toEqual(false);
  });

  it("should not allow resolving a child comment", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const parentComment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
      parentCommentId: parentComment.id,
    });

    const res = await server.post("/api/comments.resolve", {
      body: {
        token: user.getJwtToken(),
        id: comment.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#comments.unresolve", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.unresolve");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should allow unresolving a comment", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const comment = await buildResolvedComment(user, {
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/comments.unresolve", {
      body: {
        token: user.getJwtToken(),
        id: comment.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.resolvedAt).toEqual(null);
    expect(body.data.resolvedBy).toEqual(null);
    expect(body.data.resolvedById).toEqual(null);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.update).toBeTruthy();
    expect(body.policies[0].abilities.delete).toBeTruthy();
    expect(body.policies[0].abilities.resolve).toBeTruthy();
    expect(body.policies[0].abilities.unresolve).toEqual(false);
  });
});

describe("#comments.add_reaction", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.add_reaction");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should add a reaction to a comment", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/comments.add_reaction", {
      body: {
        token: user.getJwtToken(),
        id: comment.id,
        emoji: "😄",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });
});

describe("#comments.remove_reaction", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/comments.remove_reaction");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should add a reaction to a comment", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    await Reaction.create({
      emoji: "😄",
      commentId: comment.id,
      userId: user.id,
    });

    const res = await server.post("/api/comments.remove_reaction", {
      body: {
        token: user.getJwtToken(),
        id: comment.id,
        emoji: "😄",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });
});
