import { Scope } from "@shared/types";
import type { ProsemirrorData } from "@shared/types";
import {
  buildCollection,
  buildComment,
  buildCommentMark,
  buildDocument,
  buildOAuthAuthentication,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { buildOAuthUser, callMcpTool } from "@server/test/McpHelper";

const server = getTestServer();

describe("list_comments", () => {
  it("returns comments on a document", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await callMcpTool(server, accessToken, "list_comments", {
      documentId: document.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((c: { id: string }) => c.id);
    expect(ids).toContain(comment.id);
  });

  it("includes anchorText when comment is anchored", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const anchorText = "highlighted text";
    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: anchorText,
              marks: [buildCommentMark({ id: comment.id, userId: user.id })],
            },
          ],
        },
      ],
    } as ProsemirrorData;
    await document.update({ content });

    const res = await callMcpTool(server, accessToken, "list_comments", {
      documentId: document.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const match = data.find((c: { id: string }) => c.id === comment.id) as {
      anchorText: string;
    };
    expect(match).toBeDefined();
    expect(match.anchorText).toEqual(anchorText);
  });

  it("returns undefined anchorText for non-anchored comment", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await callMcpTool(server, accessToken, "list_comments", {
      documentId: document.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].anchorText).toBeUndefined();
  });
});

describe("create_comment", () => {
  it("creates a comment on a document", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "create_comment", {
      documentId: document.id,
      text: "This is a test comment",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.id).toBeDefined();
    expect(data.documentId).toEqual(document.id);
  });

  it("creates a reply to an existing comment", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const parentComment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await callMcpTool(server, accessToken, "create_comment", {
      documentId: document.id,
      text: "This is a reply",
      parentCommentId: parentComment.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.id).toBeDefined();
    expect(data.parentCommentId).toEqual(parentComment.id);
  });

  it("includes anchorText in response", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "create_comment", {
      documentId: document.id,
      text: "A new comment",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    // New comments have no anchor mark in the document, so anchorText is undefined
    expect(data.id).toBeDefined();
    expect(data.anchorText).toBeUndefined();
  });
});

describe("update_comment", () => {
  it("updates text", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await callMcpTool(server, accessToken, "update_comment", {
      id: comment.id,
      text: "Updated comment text",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.id).toEqual(comment.id);
    expect(data.text).toContain("Updated comment text");
  });

  it("includes anchorText in response", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const anchorText = "anchored content";
    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: anchorText,
              marks: [buildCommentMark({ id: comment.id, userId: user.id })],
            },
          ],
        },
      ],
    } as ProsemirrorData;
    await document.update({ content });

    const res = await callMcpTool(server, accessToken, "update_comment", {
      id: comment.id,
      text: "Updated text",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.id).toEqual(comment.id);
    expect(data.anchorText).toEqual(anchorText);
  });
});

describe("delete_comment", () => {
  it("deletes own comment", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const res = await callMcpTool(server, accessToken, "delete_comment", {
      id: comment.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.success).toBe(true);
  });

  it("fails for non-author non-admin", async () => {
    const { user } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });

    const otherUser = await buildUser({ teamId: user.teamId });
    const otherAuth = await buildOAuthAuthentication({
      user: otherUser,
      scope: [Scope.Read, Scope.Write, Scope.Create],
    });

    const res = await callMcpTool(
      server,
      otherAuth.accessToken!,
      "delete_comment",
      { id: comment.id }
    );

    expect(res?.result?.isError).toBe(true);
  });
});
