import { randomUUID } from "node:crypto";
import { http, HttpResponse } from "msw";
import { Minute, Day } from "@shared/utils/time";
import { OAuthClient } from "@server/models";
import {
  buildMetadataDocumentOAuthClient,
  buildOAuthClient,
  buildShare,
  buildTeam,
} from "@server/test/factories";
import { server } from "@server/test/msw";
import { ClientMetadataHelper } from "./ClientMetadataHelper";

const buildClientId = () =>
  `https://${randomUUID()}.example.com/oauth/client.json`;

const buildDocument = (clientId: string, overrides = {}) => ({
  client_id: clientId,
  client_name: "Example MCP Client",
  client_uri: "https://example.com",
  logo_uri: "https://example.com/logo.png",
  redirect_uris: ["https://example.com/callback"],
  token_endpoint_auth_method: "none",
  ...overrides,
});

const mockDocument = (
  clientId: string,
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
) => {
  let requests = 0;
  server.use(
    http.get(clientId, () => {
      requests++;
      return new HttpResponse(
        typeof body === "string" ? body : JSON.stringify(body),
        {
          status: init.status ?? 200,
          headers: { "Content-Type": "application/json", ...init.headers },
        }
      );
    })
  );
  return { requests: () => requests };
};

describe("ClientMetadataHelper", () => {
  describe("isValidClientIdUrl", () => {
    it("should accept an https URL with a path", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://claude.ai/oauth/mcp-oauth-client-metadata"
        )
      ).toBe(true);
    });

    it("should accept a query string", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://example.com/client.json?version=1"
        )
      ).toBe(true);
    });

    it("should reject http", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl("http://example.com/client")
      ).toBe(false);
    });

    it("should reject a URL without a path", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl("https://example.com")
      ).toBe(false);
      expect(
        ClientMetadataHelper.isValidClientIdUrl("https://example.com/")
      ).toBe(false);
    });

    it("should reject a fragment", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl("https://example.com/client#a")
      ).toBe(false);
    });

    it("should reject userinfo", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://user:pass@example.com/client"
        )
      ).toBe(false);
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://user@example.com/client"
        )
      ).toBe(false);
    });

    it("should reject dot path segments", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://example.com/a/../client"
        )
      ).toBe(false);
      expect(
        ClientMetadataHelper.isValidClientIdUrl("https://example.com/./client")
      ).toBe(false);
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://example.com/a/%2E%2E/client"
        )
      ).toBe(false);
    });

    it("should reject a value that is not a URL", () => {
      expect(ClientMetadataHelper.isValidClientIdUrl("https://")).toBe(false);
      expect(ClientMetadataHelper.isValidClientIdUrl("abc123")).toBe(false);
    });
  });

  describe("isInstallationHost", () => {
    it("should match the base domain and its subdomains", async () => {
      expect(await ClientMetadataHelper.isInstallationHost("outline.dev")).toBe(
        true
      );
      expect(
        await ClientMetadataHelper.isInstallationHost("team.outline.dev")
      ).toBe(true);
    });

    it("should match a custom workspace domain", async () => {
      const domain = `${randomUUID()}.example.org`;
      await buildTeam({ domain });

      expect(await ClientMetadataHelper.isInstallationHost(domain)).toBe(true);
    });

    it("should match a custom share domain", async () => {
      const domain = `${randomUUID()}.example.org`;
      await buildShare({ domain });

      expect(await ClientMetadataHelper.isInstallationHost(domain)).toBe(true);
    });

    it("should not match another host", async () => {
      expect(await ClientMetadataHelper.isInstallationHost("claude.ai")).toBe(
        false
      );
      expect(
        await ClientMetadataHelper.isInstallationHost("notoutline.dev")
      ).toBe(false);
    });
  });

  describe("cacheExpiry", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const headers = (values: Record<string, string>) => new Headers(values);

    it("should use max-age", () => {
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({ "Cache-Control": "public, max-age=3600" }),
        now
      );
      expect(expiresAt.getTime() - now.getTime()).toEqual(60 * Minute.ms);
    });

    it("should use Expires when there is no max-age", () => {
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({
          Expires: new Date(now.getTime() + 2 * 60 * Minute.ms).toUTCString(),
        }),
        now
      );
      expect(expiresAt.getTime() - now.getTime()).toEqual(120 * Minute.ms);
    });

    it("should clamp to the minimum duration", () => {
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({ "Cache-Control": "no-store" }),
        now
      );
      expect(expiresAt.getTime() - now.getTime()).toEqual(
        ClientMetadataHelper.minCacheDuration
      );
    });

    it("should clamp to the maximum duration", () => {
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({ "Cache-Control": "max-age=31536000" }),
        now
      );
      expect(expiresAt.getTime() - now.getTime()).toEqual(Day.ms);
    });
  });

  describe("findOrFetchByClientId", () => {
    it("should find a generated client without fetching", async () => {
      const client = await buildOAuthClient();
      const found = await ClientMetadataHelper.findOrFetchByClientId(
        client.clientId
      );
      expect(found?.id).toEqual(client.id);
    });

    it("should fetch and store a new client", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId), {
        headers: { "Cache-Control": "max-age=3600" },
      });

      const client = await ClientMetadataHelper.findOrFetchByClientId(clientId);

      expect(client).toBeTruthy();
      expect(client?.clientId).toEqual(clientId);
      expect(client?.name).toEqual("Example MCP Client");
      expect(client?.redirectUris).toEqual(["https://example.com/callback"]);
      expect(client?.developerUrl).toEqual("https://example.com");
      expect(client?.avatarUrl).toEqual("https://example.com/logo.png");
      expect(client?.clientType).toEqual("public");
      expect(client?.published).toBe(false);
      expect(client?.teamId).toBeNull();
      expect(client?.createdById).toBeNull();
      expect(client?.isCIMD).toBe(true);
      expect(client?.isDCR).toBe(false);
      expect(client?.clientSecret).toBeFalsy();
      expect(client?.registrationAccessTokenHash).toBeNull();
      expect(client?.metadataExpiresAt?.getTime()).toBeGreaterThan(
        Date.now() + 59 * Minute.ms
      );
    });

    it("should use a fresh cached client without fetching", async () => {
      const cached = await buildMetadataDocumentOAuthClient();
      const mock = mockDocument(
        cached.clientId,
        buildDocument(cached.clientId)
      );

      const client = await ClientMetadataHelper.findOrFetchByClientId(
        cached.clientId
      );

      expect(client?.id).toEqual(cached.id);
      expect(mock.requests()).toEqual(0);
    });

    it("should fetch again when the cached client has expired", async () => {
      const cached = await buildMetadataDocumentOAuthClient({
        metadataExpiresAt: new Date(Date.now() - 1000),
      });
      const mock = mockDocument(
        cached.clientId,
        buildDocument(cached.clientId, { client_name: "Renamed Client" })
      );

      const client = await ClientMetadataHelper.findOrFetchByClientId(
        cached.clientId
      );

      expect(mock.requests()).toEqual(1);
      expect(client?.id).toEqual(cached.id);
      expect(client?.name).toEqual("Renamed Client");
      expect(client?.metadataExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it("should keep the cached client when a new fetch fails", async () => {
      const cached = await buildMetadataDocumentOAuthClient({
        metadataExpiresAt: new Date(Date.now() - 1000),
      });
      mockDocument(cached.clientId, "error", { status: 500 });

      const client = await ClientMetadataHelper.findOrFetchByClientId(
        cached.clientId
      );

      expect(client).toBeNull();
      const reloaded = await OAuthClient.findByPk(cached.id);
      expect(reloaded?.name).toEqual(cached.name);
      expect(reloaded?.metadataExpiresAt).toEqual(cached.metadataExpiresAt);
    });

    it("should create one client for concurrent first fetches", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId));

      const clients = await Promise.all([
        ClientMetadataHelper.findOrFetchByClientId(clientId),
        ClientMetadataHelper.findOrFetchByClientId(clientId),
        ClientMetadataHelper.findOrFetchByClientId(clientId),
      ]);

      expect(clients.every(Boolean)).toBe(true);
      expect(await OAuthClient.count({ where: { clientId } })).toEqual(1);
    });

    it("should not fetch an invalid client_id URL", async () => {
      const client = await ClientMetadataHelper.findOrFetchByClientId(
        "https://example.com/a/../client"
      );
      expect(client).toBeNull();
    });

    it.each([
      ["a non-200 status", 404],
      ["a 201 status", 201],
    ])("should reject %s", async (_, status) => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId), { status });

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
    });

    it("should not follow redirects", async () => {
      const clientId = buildClientId();
      const target = buildClientId();
      const mock = mockDocument(target, buildDocument(clientId));
      server.use(
        http.get(
          clientId,
          () =>
            new HttpResponse(null, {
              status: 302,
              headers: { Location: target },
            })
        )
      );

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
      expect(mock.requests()).toEqual(0);
    });

    it("should reject a document larger than the limit", async () => {
      const clientId = buildClientId();
      mockDocument(
        clientId,
        buildDocument(clientId, {
          padding: "x".repeat(ClientMetadataHelper.maxDocumentSize),
        })
      );

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
    });

    it("should reject invalid JSON", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, "{ not json");

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
    });

    it("should reject a client_id that does not match the URL", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(buildClientId()));

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
    });

    it("should reject a document with a client_secret", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId, { client_secret: "abc" }));

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
    });

    it.each(["client_secret_post", "client_secret_basic", "private_key_jwt"])(
      "should reject the %s auth method",
      async (method) => {
        const clientId = buildClientId();
        mockDocument(
          clientId,
          buildDocument(clientId, { token_endpoint_auth_method: method })
        );

        expect(
          await ClientMetadataHelper.findOrFetchByClientId(clientId)
        ).toBeNull();
      }
    );

    it("should reject a document without redirect_uris", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId, { redirect_uris: [] }));

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
    });

    it("should reject an http redirect URI", async () => {
      const clientId = buildClientId();
      mockDocument(
        clientId,
        buildDocument(clientId, {
          redirect_uris: ["http://example.com/callback"],
        })
      );

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
    });

    it("should reject a document that is not JSON", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId), {
        headers: { "Content-Type": "text/plain" },
      });

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
    });

    it("should accept a structured JSON content type", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId), {
        headers: { "Content-Type": "application/ld+json; charset=utf-8" },
      });

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeTruthy();
    });

    it("should not fetch a document hosted by this installation", async () => {
      const clientId = `https://${randomUUID()}.outline.dev/client.json`;
      const mock = mockDocument(clientId, buildDocument(clientId));

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId)
      ).toBeNull();
      expect(mock.requests()).toEqual(0);
    });

    it("should accept a loopback redirect URI", async () => {
      const clientId = buildClientId();
      mockDocument(
        clientId,
        buildDocument(clientId, {
          redirect_uris: ["http://127.0.0.1:33418/callback"],
        })
      );

      const client = await ClientMetadataHelper.findOrFetchByClientId(clientId);
      expect(client?.redirectUris).toEqual(["http://127.0.0.1:33418/callback"]);
    });
  });
});
