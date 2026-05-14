import { Scope, TeamPreference } from "@shared/types";
import { UserFlag } from "@server/models/User";
import {
  buildUser,
  buildCollection,
  buildDocument,
  buildComment,
  buildOAuthAuthentication,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import {
  buildOAuthUser,
  callMcpTool,
  mcpHeaders,
  mcpRequest,
  parseMcpResponse,
} from "@server/test/McpHelper";

const server = getTestServer();

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

    it("should set the MCP flag on the user after a successful request", async () => {
      const { user, accessToken } = await buildOAuthUser();
      expect(user.getFlag(UserFlag.MCP)).toEqual(0);

      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body,
      });
      expect(res.status).toEqual(200);

      await user.reload();
      expect(user.getFlag(UserFlag.MCP)).toEqual(1);

      const second = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body,
      });
      expect(second.status).toEqual(200);

      await user.reload();
      expect(user.getFlag(UserFlag.MCP)).toEqual(1);
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
      expect(data.document.title).toEqual("Created Document");
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
          id: created.document.id,
          title: "Updated by Write Token",
        }
      );
      expect(updateRes?.result?.isError).toBeUndefined();
    });
  });
});
