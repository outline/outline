import { createHash } from "node:crypto";
import { Scope, TeamPreference } from "@shared/types";
import { iconNames } from "@shared/utils/IconNames";
import env from "@server/env";
import { UserFlag } from "@server/models/User";
import {
  buildUser,
  buildCollection,
  buildDocument,
  buildComment,
  buildOAuthAuthentication,
  buildSubdomain,
  buildTeam,
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

    it("should include WWW-Authenticate header on 401 responses", async () => {
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: { Accept: "application/json, text/event-stream" },
        body,
      });
      expect(res.status).toEqual(401);
      const wwwAuth = res.headers.get("www-authenticate");
      expect(wwwAuth).toBeTruthy();
      expect(wwwAuth).toContain("Bearer");
      expect(wwwAuth).toContain("resource_metadata=");
      expect(wwwAuth).toContain("/.well-known/oauth-protected-resource/mcp");
      expect(wwwAuth).toContain('scope="read write"');
    });

    it("should reject JWT authentication", async () => {
      const user = await buildUser();
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: {
          Authorization: `Bearer ${user.getSessionToken()}`,
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

    it("should reject requests from another origin", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: { ...mcpHeaders(accessToken), Origin: "https://evil.example" },
        body,
      });
      expect(res.status).toEqual(403);
    });

    it("should reject requests with an opaque origin", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: { ...mcpHeaders(accessToken), Origin: "null" },
        body,
      });
      expect(res.status).toEqual(403);
    });

    it.each([
      ["scheme", (url: URL) => (url.protocol = "http:")],
      ["port", (url: URL) => (url.port = "9000")],
    ])(
      "should reject requests from the app host with another %s",
      async (_name, mutate) => {
        const { accessToken } = await buildOAuthUser();
        const url = new URL(env.URL);
        mutate(url);

        const { body } = mcpRequest("tools/list");
        const res = await server.post("/mcp/", {
          headers: { ...mcpHeaders(accessToken), Origin: url.origin },
          body,
        });
        expect(res.status).toEqual(403);
      }
    );

    it("should allow requests from the app origin", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: {
          ...mcpHeaders(accessToken),
          Origin: new URL(env.URL).origin,
        },
        body,
      });
      expect(res.status).toEqual(200);
    });

    it("should allow requests from the team subdomain", async () => {
      const { user, accessToken } = await buildOAuthUser();
      await user.team.update({ subdomain: buildSubdomain() });

      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: { ...mcpHeaders(accessToken), Origin: user.team.url },
        body,
      });
      expect(res.status).toEqual(200);
    });

    it("should allow requests from the team custom domain", async () => {
      const { user, accessToken } = await buildOAuthUser();
      await user.team.update({ domain: `${buildSubdomain()}.example.com` });

      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: { ...mcpHeaders(accessToken), Origin: user.team.url },
        body,
      });
      expect(res.status).toEqual(200);
    });

    it("should reject requests from another team subdomain", async () => {
      const { user, accessToken } = await buildOAuthUser();
      await user.team.update({ subdomain: buildSubdomain() });
      const other = await buildTeam({ subdomain: buildSubdomain() });

      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: { ...mcpHeaders(accessToken), Origin: other.url },
        body,
      });
      expect(res.status).toEqual(403);
    });

    it("should return 405 for DELETE requests", async () => {
      const res = await server.delete("/mcp/");
      expect(res.status).toEqual(405);
    });

    it.each(["/mcp/sse", "/mcp/message", "/mcp/manifest.json"])(
      "should return 404 for %s without rendering the app shell",
      async (path) => {
        const res = await server.get(path);
        const body = await res.text();
        expect(res.status).toEqual(404);
        expect(body).not.toContain("<title>");
      }
    );

    it("should return 404 for POST to a path below the endpoint", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/sse", {
        headers: mcpHeaders(accessToken),
        body,
      });
      expect(res.status).toEqual(404);
    });

    it("should call a tool with a 2026-07-28 request", async () => {
      const { user, accessToken } = await buildOAuthUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        userId: user.id,
      });
      const { body } = mcpRequest("tools/call", {
        name: "list_collections",
        arguments: {},
        _meta: modernMeta("2026-07-28"),
      });
      const res = await server.post("/mcp/", {
        headers: {
          ...mcpHeaders(accessToken),
          "MCP-Protocol-Version": "2026-07-28",
          "Mcp-Method": "tools/call",
          "Mcp-Name": "list_collections",
        },
        body,
      });
      expect(res.status).toEqual(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const parsed = await parseMcpResponse(res);
      const result = parsed?.result as { content?: { text: string }[] };
      expect(result?.content?.[0]?.text).toContain(collection.id);
    });

    it("should complete a subscriptions/listen request at once", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body, resultId } = mcpRequest("subscriptions/listen", {
        notifications: {
          toolsListChanged: true,
          resourcesListChanged: true,
        },
        _meta: modernMeta("2026-07-28"),
      });
      const res = await server.post("/mcp/", {
        headers: {
          ...mcpHeaders(accessToken),
          "MCP-Protocol-Version": "2026-07-28",
          "Mcp-Method": "subscriptions/listen",
        },
        body,
      });
      expect(res.status).toEqual(200);

      const text = await res.text();
      expect(text).toContain('"resultType":"complete"');
      expect(text).toContain(`"id":${resultId}`);
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
        serverInfo?: {
          name: string;
          title?: string;
          websiteUrl?: string;
          icons?: { src: string; mimeType?: string; sizes?: string[] }[];
        };
      };

      expect(result).toBeDefined();
      expect(result?.capabilities).toBeDefined();
      expect(result?.serverInfo?.name).toEqual("outline");
      expect(result?.serverInfo?.title).toEqual("Outline");
      expect(result?.serverInfo?.websiteUrl).toMatch(/^https?:\/\//);
      expect(result?.serverInfo?.icons).toEqual([
        expect.objectContaining({
          src: expect.stringMatching(/^https?:\/\/.+\/images\/icon-192\.png$/),
          mimeType: "image/png",
          sizes: ["192x192"],
        }),
        expect.objectContaining({
          src: expect.stringMatching(/^https?:\/\/.+\/images\/icon-512\.png$/),
          mimeType: "image/png",
          sizes: ["512x512"],
        }),
      ]);
    });

    it("should not forward hop-by-hop headers from the SDK response", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      });

      const res = await server.post("/mcp/", {
        headers: { ...mcpHeaders(accessToken), Connection: "close" },
        body,
      });

      expect(res.status).toEqual(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect(res.headers.get("connection")).toEqual("close");
    });

    it("should return 202 for the notifications/initialized lifecycle message", async () => {
      const { accessToken } = await buildOAuthUser();

      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body: { jsonrpc: "2.0", method: "notifications/initialized" },
      });

      expect(res.status).toEqual(202);
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

    it("should set every annotation hint explicitly on every tool", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("tools/list");
      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body,
      });
      expect(res.status).toEqual(200);

      const parsed = await parseMcpResponse(res);
      const result = parsed?.result as
        | {
            tools: {
              name: string;
              title?: string;
              annotations?: Record<string, unknown>;
            }[];
          }
        | undefined;
      const tools = result?.tools ?? [];
      const names = tools.map((tool) => tool.name);
      expect(names).toContain("delete_collection");
      expect(names).toContain("delete_document");

      for (const tool of tools) {
        expect(tool.title, tool.name).toBeTruthy();
        expect(tool.annotations, tool.name).toEqual({
          destructiveHint: expect.any(Boolean),
          idempotentHint: expect.any(Boolean),
          openWorldHint: tool.name === "create_document",
          readOnlyHint: expect.any(Boolean),
        });

        if (tool.annotations?.readOnlyHint) {
          expect(tool.annotations.destructiveHint, tool.name).toBe(false);
        }
        if (/^(delete|update|move)_/.test(tool.name)) {
          expect(tool.annotations?.destructiveHint, tool.name).toBe(true);
        }
      }
    });

    it("should reject tool arguments with too many elements", async () => {
      const { accessToken } = await buildOAuthUser();

      const res = await callMcpTool(server, accessToken, "list_collections", {
        extra: Array.from({ length: 1001 }, (_, i) => i),
      });
      expect(res?.result?.isError).toBe(true);
      expect(res?.result?.content?.[0]?.text).toContain(
        "more than the maximum of 1000 elements"
      );
    });
  });

  describe("resources", () => {
    it("initialize advertises the resources capability", async () => {
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
        capabilities?: { resources?: unknown };
      };
      expect(result?.capabilities?.resources).toBeDefined();
    });

    it("resources/list includes the icons resource", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("resources/list");

      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body,
      });
      expect(res.status).toEqual(200);

      const parsed = await parseMcpResponse(res);
      const result = parsed?.result as {
        resources?: { uri: string; mimeType?: string }[];
      };
      const icons = result?.resources?.find((r) => r.uri === "outline://icons");
      expect(icons).toBeDefined();
      expect(icons?.mimeType).toEqual("application/json");
    });

    it("resources/read returns the icon names as JSON", async () => {
      const { accessToken } = await buildOAuthUser();
      const { body } = mcpRequest("resources/read", {
        uri: "outline://icons",
      });

      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body,
      });
      expect(res.status).toEqual(200);

      const parsed = await parseMcpResponse(res);
      const result = parsed?.result as {
        contents?: { uri: string; mimeType?: string; text: string }[];
      };
      const content = result?.contents?.[0];
      expect(content?.uri).toEqual("outline://icons");
      expect(content?.mimeType).toEqual("application/json");
      expect(JSON.parse(content?.text ?? "null")).toEqual(iconNames);
    });
  });

  describe("skills", () => {
    const skillUri = "skill://outline/find-and-cite/SKILL.md";

    it("initialize advertises the skills extension", async () => {
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
        capabilities?: { extensions?: Record<string, unknown> };
      };
      expect(
        result?.capabilities?.extensions?.["io.modelcontextprotocol/skills"]
      ).toEqual({});
    });

    it("skills/list returns entries with digests that match the content", async () => {
      const { accessToken } = await buildOAuthUser();
      const listRes = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body: mcpRequest("skills/list").body,
      });
      expect(listRes.status).toEqual(200);

      const listed = await parseMcpResponse(listRes);
      const result = listed?.result as {
        resultType: string;
        ttlMs: number;
        cacheScope: string;
        skills: {
          uri: string;
          frontmatter: { name: string; description: string };
          resources: { uri: string; digest: string; size: number }[];
        }[];
      };
      expect(result.resultType).toEqual("complete");
      expect(result.ttlMs).toBeGreaterThan(0);
      expect(result.cacheScope).toEqual("public");

      const skill = result.skills.find((s) => s.uri === skillUri);
      expect(skill?.frontmatter.name).toEqual("find-and-cite");
      expect(skill?.frontmatter.description).toBeTruthy();

      const entry = skill?.resources.find((r) => r.uri === skillUri);
      expect(entry?.digest).toMatch(/^sha256:[0-9a-f]{64}$/);

      const readRes = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body: mcpRequest("resources/read", { uri: skillUri }).body,
      });
      const read = await parseMcpResponse(readRes);
      const readResult = read?.result as {
        contents: { mimeType: string; text: string }[];
      };
      const content = readResult.contents[0];
      const bytes = Buffer.from(content.text, "utf8");
      expect(content.mimeType).toEqual("text/markdown");
      expect(bytes.byteLength).toEqual(entry?.size);
      expect(
        `sha256:${createHash("sha256").update(bytes).digest("hex")}`
      ).toEqual(entry?.digest);
    });

    it("skills/get returns a single skill", async () => {
      const { accessToken } = await buildOAuthUser();
      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body: mcpRequest("skills/get", { uri: skillUri }).body,
      });
      expect(res.status).toEqual(200);

      const parsed = await parseMcpResponse(res);
      const result = parsed?.result as {
        resultType: string;
        skill: { uri: string; frontmatter: { name: string } };
      };
      expect(result.resultType).toEqual("complete");
      expect(result.skill.uri).toEqual(skillUri);
      expect(result.skill.frontmatter.name).toEqual("find-and-cite");
    });

    it("skills/get returns invalid params for an unknown skill", async () => {
      const { accessToken } = await buildOAuthUser();
      const res = await server.post("/mcp/", {
        headers: mcpHeaders(accessToken),
        body: mcpRequest("skills/get", {
          uri: "skill://outline/unknown/SKILL.md",
        }).body,
      });

      const parsed = await parseMcpResponse(res);
      const responseError = parsed?.error as { code: number };
      expect(responseError.code).toEqual(-32602);
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
      expect(res?.error).toMatchObject({ code: -32602 });
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
      expect(res?.error).toMatchObject({ code: -32602 });
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
      expect(res?.error).toMatchObject({ code: -32602 });
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
      expect(res?.error).toMatchObject({ code: -32602 });
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

/**
 * Builds the per-request `_meta` envelope of a 2026-07-28 request.
 *
 * @param protocolVersion - the protocol version to claim.
 * @returns the envelope.
 */
function modernMeta(protocolVersion: string) {
  return {
    "io.modelcontextprotocol/protocolVersion": protocolVersion,
    "io.modelcontextprotocol/clientInfo": {
      name: "test-client",
      version: "1.0.0",
    },
    "io.modelcontextprotocol/clientCapabilities": {},
  };
}
