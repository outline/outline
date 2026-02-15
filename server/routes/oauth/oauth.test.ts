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
    expect(body.client_secret_expires_at).toEqual(0);
    expect(body.client_name).toEqual("Test MCP Client");
    expect(body.redirect_uris).toEqual(["https://example.com/callback"]);
    expect(body.grant_types).toEqual(["authorization_code"]);
    expect(body.response_types).toEqual(["code"]);
    expect(body.token_endpoint_auth_method).toEqual("none");

    const client = await OAuthClient.findByClientId(body.client_id);
    expect(client).not.toBeNull();
    expect(client!.teamId).toEqual(team.id);
    expect(client!.createdById).toBeNull();
    expect(client!.clientType).toEqual("public");
    expect(client!.published).toEqual(true);
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
    expect(body.scopes_supported).toEqual(["read", "write", "create"]);
  });
});
