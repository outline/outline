import {
  buildCollection,
  buildComment,
  buildDocument,
  buildResolvedComment,
  buildShare,
  buildTemplate,
  buildUser,
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

  it("does not return the document tree of a private collection to a non-member admin", async () => {
    const { user, accessToken } = await buildOAuthUser({ role: "admin" });
    const author = await buildUser({ teamId: user.teamId });
    const collection = await buildCollection({
      teamId: author.teamId,
      userId: author.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: author.teamId,
      userId: author.id,
      collectionId: collection.id,
      title: "Secret plans",
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "collection",
      id: collection.id,
    });

    const content = res?.result?.content ?? [];
    expect(content.length).toEqual(1);
    expect(JSON.parse(content[0].text ?? "{}").id).toEqual(collection.id);
    expect(JSON.stringify(content)).not.toContain(document.id);
  });

  it("returns the document tree of a private collection to a member", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "collection",
      id: collection.id,
    });

    const content = res?.result?.content ?? [];
    expect(content.length).toEqual(2);
    expect(content[1].text).toContain(document.id);
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
    expect(metadata.textLength).toBeUndefined();
    expect(metadata.nextOffset).toBeUndefined();

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

  it("pages long document text on line boundaries", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i}`);
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      text: lines.join("\n\n"),
    });

    let offset = 0;
    let combined = "";
    let pages = 0;
    let textLength = 0;

    do {
      const res = await callMcpTool(server, accessToken, "fetch", {
        resource: "document",
        id: document.id,
        offset,
        limit: 100,
      });
      const metadata = JSON.parse(res!.result!.content![0].text ?? "{}");
      const text = res!.result!.content![1].text ?? "";

      expect(text.length).toBeLessThanOrEqual(100);
      if (metadata.nextOffset !== undefined) {
        expect(text.endsWith("\n")).toBe(true);
      }

      combined += text;
      textLength = metadata.textLength ?? textLength;
      offset = metadata.nextOffset;
      pages++;
    } while (offset !== undefined);

    expect(pages).toBeGreaterThan(1);
    expect(combined.length).toEqual(textLength);
    expect(combined).toContain("Line 0");
    expect(combined).toContain("Line 49");
  });

  it("cuts a line longer than the limit", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      text: "a".repeat(250),
    });

    const res = await callMcpTool(server, accessToken, "fetch", {
      resource: "document",
      id: document.id,
      limit: 100,
    });
    const metadata = JSON.parse(res!.result!.content![0].text ?? "{}");

    expect(res!.result!.content![1].text).toEqual("a".repeat(100));
    expect(metadata.nextOffset).toEqual(100);
  });

  it("does not split a surrogate pair between pages", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      text: `${"a".repeat(99)}😀b`,
    });

    const first = await callMcpTool(server, accessToken, "fetch", {
      resource: "document",
      id: document.id,
      limit: 100,
    });
    const firstMetadata = JSON.parse(first!.result!.content![0].text ?? "{}");

    expect(first!.result!.content![1].text).toEqual(`${"a".repeat(99)}😀`);
    expect(firstMetadata.nextOffset).toEqual(101);

    const second = await callMcpTool(server, accessToken, "fetch", {
      resource: "document",
      id: document.id,
      offset: 99,
      limit: 1,
    });
    const secondMetadata = JSON.parse(second!.result!.content![0].text ?? "{}");

    expect(second!.result!.content![1].text).toEqual("😀");
    expect(secondMetadata.nextOffset).toEqual(101);
  });
});
