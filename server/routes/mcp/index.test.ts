import { Scope, TeamPreference } from "@shared/types";
import {
  buildUser,
  buildAdmin,
  buildCollection,
  buildDocument,
  buildComment,
  buildOAuthAuthentication,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import {
  mcpHeaders,
  mcpRequest,
  parseMcpResponse,
  callMcpTool,
  readMcpResource,
} from "@server/test/McpHelper";

const server = getTestServer();

async function buildOAuthUser(
  overrides: { teamId?: string; role?: string } = {}
) {
  const user =
    overrides.role === "admin"
      ? await buildAdmin(overrides.teamId ? { teamId: overrides.teamId } : {})
      : await buildUser(overrides.teamId ? { teamId: overrides.teamId } : {});
  const auth = await buildOAuthAuthentication({
    user,
    scope: [Scope.Read, Scope.Write, Scope.Create],
  });
  return { user, accessToken: auth.accessToken! };
}

describe("POST /mcp/", () => {
  describe("protocol", () => {
    it("should require authentication", async () => {
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: { Accept: "application/json, text/event-stream" },
        body,
      });
      expect(res.status).toEqual(401);
    });

    it("should reject JWT authentication", async () => {
      const user = await buildUser();
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: {
          Authorization: `Bearer ${user.getJwtToken()}`,
          Accept: "application/json, text/event-stream",
        },
        body,
      });
      // JWT tokens are rejected when OAuth is required
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should return 404 when MCP preference is disabled", async () => {
      const { user, accessToken } = await buildOAuthUser();
      user.team.setPreference(TeamPreference.MCP, false);
      await user.team.save();

      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body,
      });
      expect(res.status).toEqual(404);
    });

    it("should return 405 for GET requests", async () => {
      const res = await server.get("/mcp/");
      expect(res.status).toEqual(405);
    });

    it("should return 405 for DELETE requests", async () => {
      const res = await server.delete("/mcp/");
      expect(res.status).toEqual(405);
    });

    it("should handle initialize and return capabilities", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      });

      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body,
      });

      expect(res.status).toEqual(200);

      const parsed = await parseMcpResponse(res);
      const result = parsed?.result as {
        capabilities?: unknown;
        serverInfo?: { name: string };
      };

      expect(result).toBeDefined();
      expect(result?.capabilities).toBeDefined();
      expect(result?.serverInfo?.name).toEqual("outline");
    });
  });

  describe("collection tools", () => {
    it("list_collections returns user collections", async () => {
      const { user, accessToken } = await buildOAuthUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        userId: user.id,
      });

      const res = await callMcpTool(server, accessToken, "list_collections");
      const data = (res?.result?.content ?? []).map((c: { text: string }) =>
        JSON.parse(c.text)
      );

      expect(data.length).toBeGreaterThanOrEqual(1);
      const ids = data.map((c: { id: string }) => c.id);
      expect(ids).toContain(collection.id);

      const match = data.find(
        (c: { id: string }) => c.id === collection.id
      ) as { url: string };
      expect(match.url).toMatch(/^https?:\/\//);
    });

    it("list_collections does not return collections from another team", async () => {
      const { accessToken } = await buildOAuthUser();
      const otherUser = await buildUser();
      const otherCollection = await buildCollection({
        teamId: otherUser.teamId,
        userId: otherUser.id,
      });

      const res = await callMcpTool(server, accessToken, "list_collections");
      const data = (res?.result?.content ?? []).map((c: { text: string }) =>
        JSON.parse(c.text)
      );

      const ids = data.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(otherCollection.id);
    });

    it("create_collection creates with name, description, icon, color", async () => {
      const { accessToken } = await buildOAuthUser();

      const res = await callMcpTool(server, accessToken, "create_collection", {
        name: "Test Collection",
        description: "A test description",
        icon: "rocket",
        color: "#FF0000",
      });
      const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

      expect(data.name).toEqual("Test Collection");
      expect(data.icon).toEqual("rocket");
      expect(data.color).toEqual("#FF0000");
      expect(data.id).toBeDefined();
      expect(data.url).toMatch(/^https?:\/\//);
    });

    it("update_collection updates fields on existing collection", async () => {
      const { user, accessToken } = await buildOAuthUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        userId: user.id,
      });

      const res = await callMcpTool(server, accessToken, "update_collection", {
        id: collection.id,
        name: "Updated Name",
        description: "Updated description",
      });
      const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

      expect(data.name).toEqual("Updated Name");
      expect(data.url).toMatch(/^https?:\/\//);
    });

    it("get_collection resource returns collection details", async () => {
      const { user, accessToken } = await buildOAuthUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        userId: user.id,
      });

      const res = await readMcpResource(
        server,
        accessToken,
        `outline://collections/${collection.id}`
      );

      expect(res?.result?.contents).toBeDefined();
      expect(res!.result!.contents!.length).toBeGreaterThanOrEqual(1);

      const data = JSON.parse(res!.result!.contents![0].text ?? "{}");
      expect(data.id).toEqual(collection.id);
      expect(data.url).toMatch(/^https?:\/\//);
    });
  });

  describe("document tools", () => {
    it("list_documents returns recent documents", async () => {
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

      const ids = data.map((d: { id: string }) => d.id);
      expect(ids).toContain(document.id);

      const match = data.find((d: { id: string }) => d.id === document.id) as {
        url: string;
      };
      expect(match.url).toMatch(/^https?:\/\//);
    });

    it("list_documents filters by collection", async () => {
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

      const ids = data.map((d: { id: string }) => d.id);
      expect(ids).toContain(doc1.id);
      expect(
        data.every(
          (d: { collectionId: string }) => d.collectionId === collection1.id
        )
      ).toBe(true);
    });

    it("create_document creates in a collection", async () => {
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

      expect(data.title).toEqual("New Document");
      expect(data.collectionId).toEqual(collection.id);
      expect(data.id).toBeDefined();
      expect(data.url).toMatch(/^https?:\/\//);
    });

    it("create_document creates nested under parent document", async () => {
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

      expect(data.title).toEqual("Child Document");
      expect(data.parentDocumentId).toEqual(parent.id);
    });

    it("update_document updates title and text", async () => {
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

      expect(data.title).toEqual("Updated Title");
      expect(data.url).toMatch(/^https?:\/\//);
    });

    it("update_document unpublishes a document", async () => {
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

      expect(data.id).toEqual(document.id);
      expect(res?.result?.isError).toBeUndefined();
    });

    it("update_document fails to unpublish a document with children", async () => {
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

    it("move_document moves to a different collection", async () => {
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
      const moved = data.find((d: { id: string }) => d.id === document.id) as {
        collectionId: string;
      };
      expect(moved).toBeDefined();
      expect(moved.collectionId).toEqual(collection2.id);
    });

    it("move_document moves under a parent document", async () => {
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
      const moved = data.find((d: { id: string }) => d.id === child.id) as {
        parentDocumentId: string;
      };
      expect(moved).toBeDefined();
      expect(moved.parentDocumentId).toEqual(parent.id);
    });

    it("move_document fails without collectionId or parentDocumentId", async () => {
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

    it("move_document fails when nesting a document inside itself", async () => {
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

    it("get_document resource returns metadata and markdown", async () => {
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

      const res = await readMcpResource(
        server,
        accessToken,
        `outline://documents/${document.id}`
      );

      expect(res?.result?.contents).toBeDefined();
      expect(res!.result!.contents!.length).toEqual(2);

      // First content is JSON metadata
      const metadata = JSON.parse(res!.result!.contents![0].text ?? "{}");
      expect(metadata.id).toEqual(document.id);
      expect(metadata.title).toEqual(document.title);
      expect(metadata.url).toMatch(/^https?:\/\//);

      // Second content is markdown text
      expect(res!.result!.contents![1].mimeType).toEqual("text/markdown");
      expect(res!.result!.contents![1].text).toContain("Hello");
    });
  });

  describe("comment tools", () => {
    it("list_comments returns comments on a document", async () => {
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

    it("create_comment creates a comment on a document", async () => {
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

    it("create_comment creates a reply to an existing comment", async () => {
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

    it("update_comment updates text", async () => {
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

    it("delete_comment deletes own comment", async () => {
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

    it("delete_comment fails for non-author non-admin", async () => {
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

      // Create a different non-admin user on the same team
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

  describe("scope enforcement", () => {
    async function buildScopedOAuthUser(scope: Scope[]) {
      const user = await buildUser();
      const auth = await buildOAuthAuthentication({ user, scope });
      return { user, accessToken: auth.accessToken! };
    }

    it("read-only token can call list_collections", async () => {
      const { user, accessToken } = await buildScopedOAuthUser([Scope.Read]);
      await buildCollection({ teamId: user.teamId, userId: user.id });

      const res = await callMcpTool(server, accessToken, "list_collections");
      expect(res?.error).toBeUndefined();
      const data = (res?.result?.content ?? []).map((c: { text: string }) =>
        JSON.parse(c.text)
      );
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it("read-only token does not have create_document tool", async () => {
      const { user, accessToken } = await buildScopedOAuthUser([Scope.Read]);
      await buildCollection({
        teamId: user.teamId,
        userId: user.id,
      });

      const res = await callMcpTool(server, accessToken, "create_document", {
        title: "Should Fail",
      });
      expect(res?.result?.isError).toBe(true);
    });

    it("read-only token does not have update_document tool", async () => {
      const { user, accessToken } = await buildScopedOAuthUser([Scope.Read]);
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
        title: "Should Fail",
      });
      expect(res?.result?.isError).toBe(true);
    });

    it("read-only token does not have delete_comment tool", async () => {
      const { user, accessToken } = await buildScopedOAuthUser([Scope.Read]);
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
      expect(res?.result?.isError).toBe(true);
    });

    it("create-scoped token can call create_document", async () => {
      const { user, accessToken } = await buildScopedOAuthUser([Scope.Create]);
      const collection = await buildCollection({
        teamId: user.teamId,
        userId: user.id,
      });

      const res = await callMcpTool(server, accessToken, "create_document", {
        title: "Created Document",
        text: "Content",
        collectionId: collection.id,
      });
      expect(res?.result?.isError).toBeUndefined();
      const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");
      expect(data.title).toEqual("Created Document");
    });

    it("create-scoped token does not have update_document tool", async () => {
      const { user, accessToken } = await buildScopedOAuthUser([Scope.Create]);
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
        title: "Should Fail",
      });
      expect(res?.result?.isError).toBe(true);
    });

    it("write-scoped token can call all operations", async () => {
      const { user, accessToken } = await buildScopedOAuthUser([Scope.Write]);
      const collection = await buildCollection({
        teamId: user.teamId,
        userId: user.id,
      });

      // Can list (write grants read)
      const listRes = await callMcpTool(
        server,
        accessToken,
        "list_collections"
      );
      expect(listRes?.result?.isError).toBeUndefined();

      // Can create (write grants create)
      const createRes = await callMcpTool(
        server,
        accessToken,
        "create_document",
        {
          title: "Write Token Doc",
          text: "Content",
          collectionId: collection.id,
        }
      );
      expect(createRes?.result?.isError).toBeUndefined();
      const created = JSON.parse(createRes?.result?.content?.[0]?.text ?? "{}");

      // Can update
      const updateRes = await callMcpTool(
        server,
        accessToken,
        "update_document",
        {
          id: created.id,
          title: "Updated by Write Token",
        }
      );
      expect(updateRes?.result?.isError).toBeUndefined();
    });
  });
});
