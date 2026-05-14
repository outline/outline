import {
  buildCollection,
  buildComment,
  buildDocument,
  buildResolvedComment,
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
});
