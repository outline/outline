import { randomUUID } from "node:crypto";
import { http, HttpResponse } from "msw";
import { TeamPreference } from "@shared/types";
import { OAuthClient } from "@server/models";
import { server as msw } from "@server/test/msw";
import {
  buildApiKey,
  buildMetadataDocumentOAuthClient,
  buildTeam,
  buildUser,
  buildAdmin,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("oauthClients.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthClients.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return all clients for admin", async () => {
    const team = await buildTeam();
    const another = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });

    await OAuthClient.create({
      teamId: another.id,
      createdById: admin.id,
      name: "Another Client",
      redirectUris: ["https://example.com/callback"],
      published: true,
    });

    await OAuthClient.create({
      teamId: team.id,
      createdById: admin.id,
      name: "Published Client",
      redirectUris: ["https://example.com/callback"],
      published: true,
    });

    await OAuthClient.create({
      teamId: team.id,
      createdById: admin.id,
      name: "Unpublished Client",
      redirectUris: ["https://example.com/callback"],
      published: false,
    });

    const res = await server.post("/api/oauthClients.list", admin);

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data.map((c: { name: string }) => c.name).sort()).toEqual([
      "Published Client",
      "Unpublished Client",
    ]);
    expect(body.data[0].id).toBeDefined();
    expect(body.data[0].redirectUris).toBeDefined();
  });
});

describe("oauthClients.list metadata documents", () => {
  it("should not include metadata document clients", async () => {
    const admin = await buildAdmin();
    const client = await buildMetadataDocumentOAuthClient();

    const res = await server.post("/api/oauthClients.list", admin);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(
      body.data.map((c: { clientId: string }) => c.clientId)
    ).not.toContain(client.clientId);
  });
});

describe("oauthClients.info", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthClients.info");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return confidential information about an OAuth client when admin", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    const res = await server.post("/api/oauthClients.info", user, {
      body: {
        id: client.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toEqual("Test Client");
    expect(body.data.published).toBeFalsy();
    expect(body.data.clientSecret).toBeDefined();
    expect(body.data.redirectUris).toEqual(["https://example.com/callback"]);
  });

  it("should not return the client secret to a read-only credential", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const apiKey = await buildApiKey({ userId: user.id, scope: ["read"] });

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    const res = await server.post("/api/oauthClients.info", {
      headers: { authorization: `Bearer ${apiKey.value}` },
      body: {
        id: client.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("Test Client");
    expect(body.data.clientSecret).toBeUndefined();
  });

  it("should return the client secret to a write credential", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const apiKey = await buildApiKey({ userId: user.id, scope: ["write"] });

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    const res = await server.post("/api/oauthClients.info", {
      headers: { authorization: `Bearer ${apiKey.value}` },
      body: {
        id: client.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.clientSecret).toEqual(client.clientSecret);
  });

  it("should return basic information about an OAuth client when member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    const res = await server.post("/api/oauthClients.info", user, {
      body: {
        id: client.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeUndefined();
    expect(body.data.name).toEqual("Test Client");
    expect(body.data.clientSecret).toBeUndefined();
  });

  it("should return information about an OAuth client when published", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser();

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: admin.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
      published: true,
    });

    const res = await server.post("/api/oauthClients.info", user, {
      body: {
        id: client.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("Test Client");
    expect(body.data.published).toBeTruthy();
    expect(body.data.id).toBeUndefined();
    expect(body.data.redirectUris).toBeUndefined();
  });

  it("should allow querying by clientId", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser();

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: admin.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
      published: true,
    });

    const res = await server.post("/api/oauthClients.info", user, {
      body: {
        clientId: client.clientId,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("Test Client");
    expect(body.data.published).toBeTruthy();
    expect(body.data.id).toBeUndefined();
    expect(body.data.redirectUris).toBeUndefined();
  });

  it("should fetch a client by its metadata document URL", async () => {
    const user = await buildUser();
    const clientId = `https://${randomUUID()}.example.com/oauth/client.json`;
    msw.use(
      http.get(clientId, () =>
        HttpResponse.json({
          client_id: clientId,
          client_name: "Example MCP Client",
          redirect_uris: ["https://example.com/callback"],
        })
      )
    );

    const res = await server.post("/api/oauthClients.info", user, {
      body: {
        clientId,
        redirectUri: "https://example.com/callback",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("Example MCP Client");
    expect(body.data.clientId).toEqual(clientId);
    expect(body.data.clientSecret).toBeUndefined();
    expect(body.policies).toEqual([]);
  });

  it("should not fetch a metadata document when MCP is disabled", async () => {
    const team = await buildTeam({
      preferences: { [TeamPreference.MCP]: false },
    });
    const user = await buildUser({ teamId: team.id });
    const clientId = `https://${randomUUID()}.example.com/oauth/client.json`;
    let requests = 0;
    msw.use(
      http.get(clientId, () => {
        requests++;
        return new HttpResponse(null, { status: 404 });
      })
    );

    const res = await server.post("/api/oauthClients.info", user, {
      body: { clientId },
    });

    expect(res.status).toEqual(403);
    expect(requests).toEqual(0);
  });

  it("should return 404 when a metadata document cannot be fetched", async () => {
    const user = await buildUser();
    const clientId = `https://${randomUUID()}.example.com/oauth/client.json`;
    msw.use(http.get(clientId, () => new HttpResponse(null, { status: 404 })));

    const res = await server.post("/api/oauthClients.info", user, {
      body: { clientId },
    });

    expect(res.status).toEqual(404);
  });

  it("should validate redirectUri parameter", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser();

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: admin.id,
      name: "Test Client",
      redirectUris: [
        "https://example.com/callback",
        "https://another.com/callback",
      ],
      published: true,
    });

    // Test with valid redirectUri
    const validRes = await server.post("/api/oauthClients.info", user, {
      body: {
        clientId: client.clientId,
        redirectUri: "https://example.com/callback",
      },
    });

    const validBody = await validRes.json();
    expect(validRes.status).toEqual(200);
    expect(validBody.data.name).toEqual("Test Client");

    // Test with invalid redirectUri
    const invalidRes = await server.post("/api/oauthClients.info", user, {
      body: {
        clientId: client.clientId,
        redirectUri: "https://malicious.com/callback",
      },
    });
    expect(invalidRes.status).toEqual(400);
  });
});

describe("oauthClients.create", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthClients.create");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should create a new OAuth client", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/oauthClients.create", admin, {
      body: {
        name: "Test Client",
        redirectUris: ["https://example.com/callback"],
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toEqual("Test Client");
    expect(body.data.redirectUris).toEqual(["https://example.com/callback"]);
  });

  it("should reject duplicate redirect uris", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/oauthClients.create", admin, {
      body: {
        name: "Test Client",
        redirectUris: [
          "https://example.com/callback",
          "https://example.com/callback",
        ],
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toContain("Must not contain duplicate urls");
  });
});

describe("oauthclients.update", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthClients.update");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should allow updating an OAuth client", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: admin.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
      published: true,
    });

    const res = await server.post("/api/oauthClients.update", admin, {
      body: {
        id: client.id,
        published: false,
        name: "Renamed",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("Renamed");
    expect(body.data.published).toBeFalsy();
  });
});

describe("oauthClients.rotate_secret", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthClients.rotate_secret");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should rotate the client secret", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: admin.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    const originalSecret = client.clientSecret;

    const res = await server.post("/api/oauthClients.rotate_secret", admin, {
      body: {
        id: client.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.clientSecret).toBeDefined();
    expect(body.data.clientSecret).not.toEqual(originalSecret);
  });
});

describe("oauthClients.delete", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthClients.delete");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should delete an OAuth client", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: admin.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    const res = await server.post("/api/oauthClients.delete", admin, {
      body: {
        id: client.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);

    const deletedClient = await OAuthClient.findByPk(client.id);
    expect(deletedClient).toBeNull();
  });
});
