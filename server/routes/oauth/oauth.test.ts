import { faker } from "@faker-js/faker";
import { OAuthClient } from "@server/models";
import { buildTeam } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#oauth.register", () => {
  let team: Awaited<ReturnType<typeof buildTeam>>;
  let subdomain: string;

  beforeEach(async () => {
    subdomain = faker.internet.domainWord();
    team = await buildTeam({ subdomain });
  });

  it("should register a public client", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        client_name: "Test MCP Client",
        redirect_uris: ["https://example.com/callback"],
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(201);
    const body = await res.json();
    expect(body.client_id).toBeTruthy();
    expect(body.client_secret).toBeUndefined();
    expect(body.client_id_issued_at).toBeGreaterThan(0);
    expect(body.client_secret_expires_at).toBeUndefined();
    expect(body.client_name).toEqual("Test MCP Client");
    expect(body.redirect_uris).toEqual(["https://example.com/callback"]);
    expect(body.grant_types).toEqual(["authorization_code"]);
    expect(body.response_types).toEqual(["code"]);
    expect(body.token_endpoint_auth_method).toEqual("none");
    expect(body.registration_access_token).toBeTruthy();
    expect(body.registration_access_token).toMatch(/^ol_rat_/);
    expect(body.registration_client_uri).toContain(
      `/oauth/register/${body.client_id}`
    );

    const client = await OAuthClient.findByClientId(body.client_id);
    expect(client).not.toBeNull();
    expect(client!.teamId).toEqual(team.id);
    expect(client!.createdById).toBeNull();
    expect(client!.clientType).toEqual("public");
    expect(client!.published).toEqual(false);
  });

  it("should register a confidential client", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        client_name: "Confidential Client",
        redirect_uris: ["https://example.com/callback"],
        token_endpoint_auth_method: "client_secret_post",
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(201);
    const body = await res.json();
    expect(body.client_id).toBeTruthy();
    expect(body.client_secret).toBeTruthy();
    expect(body.token_endpoint_auth_method).toEqual("client_secret_post");

    const client = await OAuthClient.findByClientId(body.client_id);
    expect(client!.clientType).toEqual("confidential");
  });

  it("should include client_uri and logo_uri in response", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        client_name: "Branded Client",
        redirect_uris: ["https://example.com/callback"],
        client_uri: "https://example.com",
        logo_uri: "https://example.com/logo.png",
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(201);
    const body = await res.json();
    expect(body.client_uri).toEqual("https://example.com");
    expect(body.logo_uri).toEqual("https://example.com/logo.png");
  });

  it("should reject missing client_name", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        redirect_uris: ["https://example.com/callback"],
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should reject missing redirect_uris", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        client_name: "Test Client",
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should reject invalid redirect_uris", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        client_name: "Test Client",
        redirect_uris: ["not-a-url"],
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should reject empty redirect_uris array", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        client_name: "Test Client",
        redirect_uris: [],
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should reject unsupported grant types", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        client_name: "Test Client",
        redirect_uris: ["https://example.com/callback"],
        grant_types: ["client_credentials"],
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should return 404 when team is not found for subdomain", async () => {
    const res = await server.post("/oauth/register", {
      body: {
        client_name: "Test Client",
        redirect_uris: ["https://example.com/callback"],
        grant_types: ["authorization_code"],
      },
      headers: {
        // Use an invalid subdomain so that no team is found in the context
        host: `invalid-${subdomain}.outline.dev`,
      },
    });

    expect(res.status).toEqual(404);
  });
});

/**
 * Helper to register a client and return the response body including
 * registration_access_token and client_id.
 */
async function registerClient(
  server: ReturnType<typeof getTestServer>,
  subdomain: string,
  overrides: Record<string, unknown> = {}
) {
  const res = await server.post("/oauth/register", {
    body: {
      client_name: "Test Client",
      redirect_uris: ["https://example.com/callback"],
      ...overrides,
    },
    headers: {
      host: `${subdomain}.outline.dev`,
    },
  });
  return res.json();
}

describe("#oauth.register management (RFC 7592)", () => {
  let subdomain: string;

  beforeEach(async () => {
    subdomain = faker.internet.domainWord();
    await buildTeam({ subdomain });
  });

  describe("GET /oauth/register/:clientId", () => {
    it("should return client metadata", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.get(`/oauth/register/${registered.client_id}`, {
        headers: {
          Authorization: `Bearer ${registered.registration_access_token}`,
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      expect(body.client_id).toEqual(registered.client_id);
      expect(body.client_name).toEqual("Test Client");
      expect(body.redirect_uris).toEqual(["https://example.com/callback"]);
      // Per RFC 7592 Section 3.1, registration_access_token MUST NOT be included in GET
      expect(body.registration_access_token).toBeUndefined();
    });

    it("should not include client_secret in read response for confidential clients", async () => {
      const registered = await registerClient(server, subdomain, {
        client_name: "Confidential Read Test",
        token_endpoint_auth_method: "client_secret_post",
      });

      // Initial registration response should include client_secret
      expect(registered.client_secret).toBeTruthy();

      const res = await server.get(`/oauth/register/${registered.client_id}`, {
        headers: {
          Authorization: `Bearer ${registered.registration_access_token}`,
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      // Per RFC 7592 Section 3.1, client_secret SHOULD NOT be included in GET
      expect(body.client_secret).toBeUndefined();
      expect(body.client_secret_expires_at).toBeUndefined();
    });

    it("should not include client_secret in read response for public clients", async () => {
      const registered = await registerClient(server, subdomain);

      const res = await server.get(`/oauth/register/${registered.client_id}`, {
        headers: {
          Authorization: `Bearer ${registered.registration_access_token}`,
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      expect(body.client_secret).toBeUndefined();
      expect(body.client_secret_expires_at).toBeUndefined();
    });

    it("should return 401 without authorization header", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.get(`/oauth/register/${registered.client_id}`);

      expect(res.status).toEqual(401);
    });

    it("should return 401 with invalid token", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.get(`/oauth/register/${registered.client_id}`, {
        headers: {
          Authorization: "Bearer ol_rat_invalidtoken",
        },
      });

      expect(res.status).toEqual(401);
    });

    it("should return 401 when token does not match clientId", async () => {
      const client1 = await registerClient(server, subdomain);
      const client2 = await registerClient(server, subdomain, {
        client_name: "Other Client",
      });
      const res = await server.get(`/oauth/register/${client2.client_id}`, {
        headers: {
          Authorization: `Bearer ${client1.registration_access_token}`,
        },
      });

      expect(res.status).toEqual(401);
    });
  });

  describe("PUT /oauth/register/:clientId", () => {
    it("should update client metadata", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.put(`/oauth/register/${registered.client_id}`, {
        body: {
          client_name: "Updated Client",
          redirect_uris: ["https://example.com/new-callback"],
        },
        headers: {
          Authorization: `Bearer ${registered.registration_access_token}`,
        },
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      expect(body.client_name).toEqual("Updated Client");
      expect(body.redirect_uris).toEqual(["https://example.com/new-callback"]);
      expect(body.client_id).toEqual(registered.client_id);
    });

    it("should rotate registration_access_token", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.put(`/oauth/register/${registered.client_id}`, {
        body: {
          client_name: "Updated Client",
          redirect_uris: ["https://example.com/callback"],
        },
        headers: {
          Authorization: `Bearer ${registered.registration_access_token}`,
        },
      });

      const body = await res.json();
      expect(body.registration_access_token).toBeTruthy();
      expect(body.registration_access_token).not.toEqual(
        registered.registration_access_token
      );
      expect(body.registration_client_uri).toContain(
        `/oauth/register/${registered.client_id}`
      );

      // Old token should no longer work
      const res2 = await server.get(`/oauth/register/${registered.client_id}`, {
        headers: {
          Authorization: `Bearer ${registered.registration_access_token}`,
        },
      });
      expect(res2.status).toEqual(401);

      // New token should work
      const res3 = await server.get(`/oauth/register/${registered.client_id}`, {
        headers: {
          Authorization: `Bearer ${body.registration_access_token}`,
        },
      });
      expect(res3.status).toEqual(200);
    });

    it("should return 401 without authorization", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.put(`/oauth/register/${registered.client_id}`, {
        body: {
          client_name: "Updated Client",
          redirect_uris: ["https://example.com/callback"],
        },
      });

      expect(res.status).toEqual(401);
    });

    it("should reject invalid body", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.put(`/oauth/register/${registered.client_id}`, {
        body: {
          client_name: "",
          redirect_uris: [],
        },
        headers: {
          Authorization: `Bearer ${registered.registration_access_token}`,
        },
      });

      expect(res.status).toEqual(400);
    });
  });

  describe("DELETE /oauth/register/:clientId", () => {
    it("should delete the client", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.delete(
        `/oauth/register/${registered.client_id}`,
        {
          headers: {
            Authorization: `Bearer ${registered.registration_access_token}`,
          },
        }
      );

      expect(res.status).toEqual(204);

      // Client should no longer be findable
      const client = await OAuthClient.findByClientId(registered.client_id);
      expect(client).toBeNull();
    });

    it("should return 401 without authorization", async () => {
      const registered = await registerClient(server, subdomain);
      const res = await server.delete(
        `/oauth/register/${registered.client_id}`
      );

      expect(res.status).toEqual(401);
    });
  });
});

describe("GET /.well-known/oauth-authorization-server", () => {
  it("should return OAuth metadata", async () => {
    const res = await server.get("/.well-known/oauth-authorization-server");

    expect(res.status).toEqual(200);
    const body = await res.json();
    expect(body.issuer).toBeTruthy();
    expect(body.authorization_endpoint).toContain("/oauth/authorize");
    expect(body.token_endpoint).toContain("/oauth/token");
    expect(body.revocation_endpoint).toContain("/oauth/revoke");
    expect(body.registration_endpoint).toContain("/oauth/register");
    expect(body.response_types_supported).toEqual(["code"]);
    expect(body.grant_types_supported).toEqual([
      "authorization_code",
      "refresh_token",
    ]);
    expect(body.token_endpoint_auth_methods_supported).toEqual([
      "client_secret_post",
      "none",
    ]);
    expect(body.code_challenge_methods_supported).toEqual(["S256"]);
  });
});
