import { randomUUID } from "node:crypto";
import { http, HttpResponse } from "msw";
import { Minute, Day } from "@shared/utils/time";
import { TeamPreference } from "@shared/types";
import type { Team } from "@server/models";
import { OAuthClient } from "@server/models";
import UploadOAuthClientLogoTask from "@server/queues/tasks/UploadOAuthClientLogoTask";
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
        ClientMetadataHelper.isValidClientIdUrl("https://example.com?client=1")
      ).toBe(false);
    });

    it("should accept a root path", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl("https://example.com/")
      ).toBe(true);
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

    it("should reject empty userinfo", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl("https://@example.com/client")
      ).toBe(false);
      expect(
        ClientMetadataHelper.isValidClientIdUrl("https://:@example.com/client")
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

    it("should reject backslashes and whitespace that hide dot segments", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://example.com/a\\../client"
        )
      ).toBe(false);
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://example.com/a/.\t./client"
        )
      ).toBe(false);
      expect(
        ClientMetadataHelper.isValidClientIdUrl(
          "https://example.com/a/.\n./client"
        )
      ).toBe(false);
    });

    it("should reject a hostname with a trailing dot", () => {
      expect(
        ClientMetadataHelper.isValidClientIdUrl("https://example.com./client")
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

    it("should match a hostname with a trailing dot", async () => {
      expect(
        await ClientMetadataHelper.isInstallationHost("app.outline.dev.")
      ).toBe(true);
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

    it("should subtract the Age of the response", () => {
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({ "Cache-Control": "max-age=7200", Age: "3600" }),
        now
      );
      expect(expiresAt.getTime() - now.getTime()).toEqual(60 * Minute.ms);
    });

    it("should not cache past Expires when the Date header is old", () => {
      const date = new Date(now.getTime() - 30 * Minute.ms);
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({
          Date: date.toUTCString(),
          Expires: new Date(date.getTime() + 90 * Minute.ms).toUTCString(),
        }),
        now
      );
      expect(expiresAt.getTime() - now.getTime()).toEqual(60 * Minute.ms);
    });

    it("should count the time since the Date header as age for max-age", () => {
      const date = new Date(now.getTime() - 30 * Minute.ms);
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({ "Cache-Control": "max-age=5400", Date: date.toUTCString() }),
        now
      );
      expect(expiresAt.getTime() - now.getTime()).toEqual(60 * Minute.ms);
    });

    it("should use the Age header when it is larger than the time since Date", () => {
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({
          "Cache-Control": "max-age=7200",
          Age: "3600",
          Date: now.toUTCString(),
        }),
        now
      );
      expect(expiresAt.getTime() - now.getTime()).toEqual(60 * Minute.ms);
    });

    it.each(["no-store", "no-cache", "no-cache, max-age=86400"])(
      "should expire at once for %s",
      (cacheControl) => {
        const expiresAt = ClientMetadataHelper.cacheExpiry(
          headers({ "Cache-Control": cacheControl }),
          now
        );
        expect(expiresAt.getTime()).toEqual(now.getTime());
      }
    );

    it("should clamp to the minimum duration", () => {
      const expiresAt = ClientMetadataHelper.cacheExpiry(
        headers({ "Cache-Control": "max-age=0" }),
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
    let team: Team;

    beforeEach(async () => {
      team = await buildTeam();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const expectInvalidMetadata = (clientId: string, message?: string) =>
      expect(
        ClientMetadataHelper.findOrFetchByClientId(clientId, team)
      ).rejects.toMatchObject({
        id: "invalid_client_metadata",
        ...(message && { message: expect.stringContaining(message) }),
      });

    it("should not fetch when the team has turned MCP off", async () => {
      const clientId = buildClientId();
      const mock = mockDocument(clientId, buildDocument(clientId));
      const disabled = await buildTeam({
        preferences: { [TeamPreference.MCP]: false },
      });

      await expect(
        ClientMetadataHelper.findOrFetchByClientId(clientId, disabled)
      ).rejects.toThrow();
      expect(mock.requests()).toEqual(0);
    });

    it("should find a generated client without fetching", async () => {
      const client = await buildOAuthClient();
      const found = await ClientMetadataHelper.findOrFetchByClientId(
        client.clientId,
        team
      );
      expect(found?.id).toEqual(client.id);
    });

    it("should fetch and store a new client", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId), {
        headers: { "Cache-Control": "max-age=3600" },
      });

      const client = await ClientMetadataHelper.findOrFetchByClientId(
        clientId,
        team
      );

      expect(client).toBeTruthy();
      expect(client?.clientId).toEqual(clientId);
      expect(client?.name).toEqual("Example MCP Client");
      expect(client?.redirectUris).toEqual(["https://example.com/callback"]);
      expect(client?.developerUrl).toEqual("https://example.com");
      expect(client?.avatarUrl).toBeNull();
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
        cached.clientId,
        team
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
        cached.clientId,
        team
      );

      expect(mock.requests()).toEqual(1);
      expect(client?.id).toEqual(cached.id);
      expect(client?.name).toEqual("Renamed Client");
      expect(client?.metadataExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it("should fetch a no-cache document again on the next request", async () => {
      const clientId = buildClientId();
      const mock = mockDocument(clientId, buildDocument(clientId), {
        headers: { "Cache-Control": "no-cache, max-age=86400" },
      });

      const first = await ClientMetadataHelper.findOrFetchByClientId(
        clientId,
        team
      );
      const second = await ClientMetadataHelper.findOrFetchByClientId(
        clientId,
        team
      );

      expect(second?.id).toEqual(first?.id);
      expect(mock.requests()).toEqual(2);
    });

    it("should upload the logo in the background", async () => {
      const schedule = vi.spyOn(
        UploadOAuthClientLogoTask.prototype,
        "scheduleOptional"
      );
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId));

      const client = await ClientMetadataHelper.findOrFetchByClientId(
        clientId,
        team
      );

      expect(schedule).toHaveBeenCalledWith({
        oauthClientId: client?.id,
        logoUrl: "https://example.com/logo.png",
      });
    });

    it("should keep the stored logo when the document still has one", async () => {
      const cached = await buildMetadataDocumentOAuthClient({
        avatarUrl: "/api/files.get?key=public/oauth-clients/abc/logo.png",
        metadataExpiresAt: new Date(Date.now() - 1000),
      });
      mockDocument(cached.clientId, buildDocument(cached.clientId));

      const client = await ClientMetadataHelper.findOrFetchByClientId(
        cached.clientId,
        team
      );

      expect(client?.avatarUrl).toEqual(cached.avatarUrl);
    });

    it("should remove the logo when the document no longer has one", async () => {
      const cached = await buildMetadataDocumentOAuthClient({
        avatarUrl: "/api/files.get?key=public/oauth-clients/abc/logo.png",
        metadataExpiresAt: new Date(Date.now() - 1000),
      });
      mockDocument(
        cached.clientId,
        buildDocument(cached.clientId, { logo_uri: undefined })
      );

      const client = await ClientMetadataHelper.findOrFetchByClientId(
        cached.clientId,
        team
      );

      expect(client?.avatarUrl).toBeNull();
    });

    it("should keep the cached client when a new fetch fails", async () => {
      const cached = await buildMetadataDocumentOAuthClient({
        metadataExpiresAt: new Date(Date.now() - 1000),
      });
      mockDocument(cached.clientId, "error", { status: 500 });

      await expectInvalidMetadata(cached.clientId, "status 500");
      const reloaded = await OAuthClient.findByPk(cached.id);
      expect(reloaded?.name).toEqual(cached.name);
      expect(reloaded?.metadataExpiresAt).toEqual(cached.metadataExpiresAt);
    });

    it("should create one client for concurrent first fetches", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId));

      const clients = await Promise.all([
        ClientMetadataHelper.findOrFetchByClientId(clientId, team),
        ClientMetadataHelper.findOrFetchByClientId(clientId, team),
        ClientMetadataHelper.findOrFetchByClientId(clientId, team),
      ]);

      expect(clients.every(Boolean)).toBe(true);
      expect(await OAuthClient.count({ where: { clientId } })).toEqual(1);
    });

    it("should not fetch an invalid client_id URL", async () => {
      const client = await ClientMetadataHelper.findOrFetchByClientId(
        "https://example.com/a/../client",
        team
      );
      expect(client).toBeNull();
    });

    it.each([
      ["a non-200 status", 404],
      ["a 201 status", 201],
    ])("should reject %s", async (_, status) => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId), { status });

      await expectInvalidMetadata(clientId);
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

      await expectInvalidMetadata(clientId, "status 302");
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

      await expectInvalidMetadata(clientId, "could not be fetched");
    });

    it("should reject invalid JSON", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, "{ not json");

      await expectInvalidMetadata(clientId, "not valid JSON");
    });

    it("should reject a client_id that does not match the URL", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(buildClientId()));

      await expectInvalidMetadata(clientId, "does not match its URL");
    });

    it("should reject a document with a client_secret", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId, { client_secret: "abc" }));

      await expectInvalidMetadata(clientId);
    });

    it.each(["client_secret_post", "client_secret_basic", "private_key_jwt"])(
      "should reject the %s auth method",
      async (method) => {
        const clientId = buildClientId();
        mockDocument(
          clientId,
          buildDocument(clientId, { token_endpoint_auth_method: method })
        );

        await expectInvalidMetadata(clientId);
      }
    );

    it("should reject a document with private key material", async () => {
      const clientId = buildClientId();
      mockDocument(
        clientId,
        buildDocument(clientId, {
          jwks: {
            keys: [{ kty: "EC", crv: "P-256", x: "x", y: "y", d: "private" }],
          },
        })
      );

      await expectInvalidMetadata(clientId);
      expect(await OAuthClient.findByClientId(clientId)).toBeNull();
    });

    it("should accept a document with public keys", async () => {
      const clientId = buildClientId();
      mockDocument(
        clientId,
        buildDocument(clientId, {
          jwks: { keys: [{ kty: "EC", crv: "P-256", x: "x", y: "y" }] },
        })
      );

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId, team)
      ).toBeTruthy();
    });

    it("should reject a document without redirect_uris", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId, { redirect_uris: [] }));

      await expectInvalidMetadata(clientId);
    });

    it("should reject an http redirect URI", async () => {
      const clientId = buildClientId();
      mockDocument(
        clientId,
        buildDocument(clientId, {
          redirect_uris: ["http://example.com/callback"],
        })
      );

      await expectInvalidMetadata(clientId);
    });

    it("should reject a document that is not JSON", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId), {
        headers: { "Content-Type": "text/plain" },
      });

      await expectInvalidMetadata(clientId, "must be JSON");
    });

    it("should accept a structured JSON content type", async () => {
      const clientId = buildClientId();
      mockDocument(clientId, buildDocument(clientId), {
        headers: { "Content-Type": "application/ld+json; charset=utf-8" },
      });

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId, team)
      ).toBeTruthy();
    });

    it("should not fetch a document hosted by this installation", async () => {
      const clientId = `https://${randomUUID()}.outline.dev/client.json`;
      const mock = mockDocument(clientId, buildDocument(clientId));

      expect(
        await ClientMetadataHelper.findOrFetchByClientId(clientId, team)
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

      const client = await ClientMetadataHelper.findOrFetchByClientId(
        clientId,
        team
      );
      expect(client?.redirectUris).toEqual(["http://127.0.0.1:33418/callback"]);
    });
  });
});
