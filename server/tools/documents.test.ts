import { CollectionPermission, Scope } from "@shared/types";
import {
  buildUser,
  buildCollection,
  buildDocument,
  buildOAuthAuthentication,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { buildOAuthUser, callMcpTool } from "@server/test/McpHelper";

const server = getTestServer();

describe("list_documents", () => {
  it("returns recent documents", async () => {
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

    const res = await callMcpTool(server, accessToken, "list_documents");
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((d: { document: { id: string } }) => d.document.id);
    expect(ids).toContain(document.id);

    const match = data.find(
      (d: { document: { id: string } }) => d.document.id === document.id
    ) as { document: { url: string } };
    expect(match.document.url).toMatch(/^https?:\/\//);
    expect(
      (match.document as { commentCount?: number }).commentCount
    ).toBeUndefined();
  });

  it("filters by collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection1 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const collection2 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const doc1 = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection1.id,
    });
    await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection2.id,
    });

    const res = await callMcpTool(server, accessToken, "list_documents", {
      collectionId: collection1.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((d: { document: { id: string } }) => d.document.id);
    expect(ids).toContain(doc1.id);
    expect(
      data.every(
        (d: { document: { collectionId: string } }) =>
          d.document.collectionId === collection1.id
      )
    ).toBe(true);
  });

  it("does not return private documents via exact urlId match", async () => {
    const owner = await buildUser();
    const otherUser = await buildUser({ teamId: owner.teamId });

    const privateCollection = await buildCollection({
      teamId: owner.teamId,
      userId: owner.id,
      permission: null,
    });
    const privateDocument = await buildDocument({
      teamId: owner.teamId,
      userId: owner.id,
      collectionId: privateCollection.id,
      title: "Confidential",
    });

    const auth = await buildOAuthAuthentication({
      user: otherUser,
      scope: [Scope.Read],
    });

    const res = await callMcpTool(server, auth.accessToken!, "list_documents", {
      query: privateDocument.urlId,
    });

    const data = (res?.result?.content ?? []).map((c: { text?: string }) =>
      JSON.parse(c.text ?? "{}")
    );
    const ids = data.map((d: { document: { id: string } }) => d.document.id);

    expect(res?.result?.isError).not.toBe(true);
    expect(ids).not.toContain(privateDocument.id);
  });

  it("returns documents via exact urlId match when the user has access", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const auth = await buildOAuthAuthentication({
      user,
      scope: [Scope.Read],
    });

    const res = await callMcpTool(server, auth.accessToken!, "list_documents", {
      query: document.urlId,
    });

    const data = (res?.result?.content ?? []).map((c: { text?: string }) =>
      JSON.parse(c.text ?? "{}")
    );
    const ids = data.map((d: { document: { id: string } }) => d.document.id);

    expect(ids).toContain(document.id);
  });
});

describe("create_document", () => {
  it("creates in a collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "create_document", {
      title: "New Document",
      text: "Hello world",
      collectionId: collection.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.document.title).toEqual("New Document");
    expect(data.document.collectionId).toEqual(collection.id);
    expect(data.document.id).toBeDefined();
    expect(data.document.url).toMatch(/^https?:\/\//);
  });

  it("creates nested under parent document", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const parent = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "create_document", {
      title: "Child Document",
      text: "Nested content",
      parentDocumentId: parent.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.document.title).toEqual("Child Document");
    expect(data.document.parentDocumentId).toEqual(parent.id);
  });
});

describe("update_document", () => {
  it("updates title and text", async () => {
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

    const res = await callMcpTool(server, accessToken, "update_document", {
      id: document.id,
      title: "Updated Title",
      text: "Updated content",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.document.title).toEqual("Updated Title");
    expect(data.document.url).toMatch(/^https?:\/\//);
  });

  it("unpublishes a document", async () => {
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

    const res = await callMcpTool(server, accessToken, "update_document", {
      id: document.id,
      publish: false,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.document.id).toEqual(document.id);
    expect(res?.result?.isError).toBeUndefined();
  });

  it("fails to unpublish a document with children", async () => {
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
    await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      parentDocumentId: document.id,
    });

    const res = await callMcpTool(server, accessToken, "update_document", {
      id: document.id,
      publish: false,
    });

    expect(res?.result?.isError).toBe(true);
  });
});

describe("move_document", () => {
  it("moves to a different collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection1 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const collection2 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection1.id,
    });

    const res = await callMcpTool(server, accessToken, "move_document", {
      id: document.id,
      collectionId: collection2.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    expect(res?.result?.isError).toBeUndefined();
    const moved = data.find(
      (d: { document: { id: string } }) => d.document.id === document.id
    ) as { document: { collectionId: string } };
    expect(moved).toBeDefined();
    expect(moved.document.collectionId).toEqual(collection2.id);
  });

  it("moves under a parent document", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const parent = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const child = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "move_document", {
      id: child.id,
      parentDocumentId: parent.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    expect(res?.result?.isError).toBeUndefined();
    const moved = data.find(
      (d: { document: { id: string } }) => d.document.id === child.id
    ) as { document: { parentDocumentId: string } };
    expect(moved).toBeDefined();
    expect(moved.document.parentDocumentId).toEqual(parent.id);
  });

  it("fails without collectionId or parentDocumentId", async () => {
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

    const res = await callMcpTool(server, accessToken, "move_document", {
      id: document.id,
    });

    expect(res?.result?.isError).toBe(true);
  });

  it("fails when nesting a document inside itself", async () => {
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

    const res = await callMcpTool(server, accessToken, "move_document", {
      id: document.id,
      parentDocumentId: document.id,
    });

    expect(res?.result?.isError).toBe(true);
  });
});
