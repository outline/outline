import {
  buildCollection,
  buildComment,
  buildDocument,
  buildResolvedComment,
  buildShare,
  buildTemplate,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { buildOAuthUser, callMcpTool } from "@server/test/McpHelper";

const server = getTestServer();

describe("fetch", () => {
  it("returns collection details", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "collection",
      id: collection.id,
    });

    expect(res?.result?.content).toBeDefined();
    expect(res!.result!.content!.length).toBeGreaterThanOrEqual(1);

    const data = JSON.parse(res!.result!.content![0].text ?? "{}");
    expect(data.id).toEqual(collection.id);
    expect(data.url).toMatch(/^https?:\/\//);
  });

  it("returns document metadata and markdown", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      text: "# Hello\n\nWorld",
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "document",
      id: document.id,
    });

    expect(res?.result?.content).toBeDefined();
    expect(res!.result!.content!.length).toEqual(2);

    // First content is JSON metadata
    const metadata = JSON.parse(res!.result!.content![0].text ?? "{}");
    expect(metadata.document.id).toEqual(document.id);
    expect(metadata.document.title).toEqual(document.title);
    expect(metadata.document.url).toMatch(/^https?:\/\//);

    // Second content is markdown text
    expect(res!.result!.content![1].text).toContain("Hello");
  });

  it("returns the public share url for a shared document", async () => {
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
    const share = await buildShare({
      teamId: user.teamId,
      userId: user.id,
      documentId: document.id,
      published: true,
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "document",
      id: document.id,
    });

    const metadata = JSON.parse(res!.result!.content![0].text ?? "{}");
    expect(metadata.shareUrl).toMatch(/^https?:\/\//);
    expect(metadata.shareUrl).toContain(`/s/${share.id}`);
  });

  it("omits shareUrl when the share is revoked", async () => {
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
    await buildShare({
      teamId: user.teamId,
      userId: user.id,
      documentId: document.id,
      published: true,
      revokedAt: new Date(),
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "document",
      id: document.id,
    });

    const metadata = JSON.parse(res!.result!.content![0].text ?? "{}");
    expect(metadata.shareUrl).toBeUndefined();
  });

  it("returns the public share url for a shared collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const share = await buildShare({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      published: true,
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "collection",
      id: collection.id,
    });

    const data = JSON.parse(res!.result!.content![0].text ?? "{}");
    expect(data.shareUrl).toMatch(/^https?:\/\//);
    expect(data.shareUrl).toContain(`/s/${share.id}`);
  });

  it("returns unresolved commentCount on documents", async () => {
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
    const thread = await buildComment({
      documentId: document.id,
      userId: user.id,
    });
    await buildComment({
      documentId: document.id,
      userId: user.id,
      parentCommentId: thread.id,
    });
    await buildResolvedComment(user, {
      documentId: document.id,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "document",
      id: document.id,
    });

    const metadata = JSON.parse(res!.result!.content![0].text ?? "{}");
    expect(metadata.document.commentCount).toEqual(2);
  });

  it("returns template metadata and markdown", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const template = await buildTemplate({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      text: "Body of the template",
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "template",
      id: template.id,
    });

    expect(res?.result?.isError).not.toBe(true);
    expect(res!.result!.content!.length).toEqual(2);

    const metadata = JSON.parse(res!.result!.content![0].text ?? "{}");
    expect(metadata.id).toEqual(template.id);
    expect(metadata.url).toMatch(/^https?:\/\//);

    expect(res!.result!.content![1].text).toContain("Body of the template");
  });
});
