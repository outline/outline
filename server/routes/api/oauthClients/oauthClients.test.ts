import { OAuthClient } from "@server/models";
import { buildTeam, buildUser, buildAdmin } from "@server/test/factories";
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

    const res = await server.post("/api/oauthClients.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });

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

describe("oauthClients.info", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/oauthClients.info");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return information about an OAuth client when authorized", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const client = await OAuthClient.create({
      teamId: team.id,
      createdById: user.id,
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
    });

    const res = await server.post("/api/oauthClients.info", {
      body: {
        token: user.getJwtToken(),
        id: client.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toEqual("Test Client");
    expect(body.data.published).toBeFalsy();
    expect(body.data.redirectUris).toEqual(["https://example.com/callback"]);
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

    const res = await server.post("/api/oauthClients.info", {
      body: {
        token: user.getJwtToken(),
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

    const res = await server.post("/api/oauthClients.info", {
      body: {
        token: user.getJwtToken(),
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
    const validRes = await server.post("/api/oauthClients.info", {
      body: {
        token: user.getJwtToken(),
        clientId: client.clientId,
        redirectUri: "https://example.com/callback",
      },
    });

    const validBody = await validRes.json();
    expect(validRes.status).toEqual(200);
    expect(validBody.data.name).toEqual("Test Client");

    // Test with invalid redirectUri
    const invalidRes = await server.post("/api/oauthClients.info", {
      body: {
        token: user.getJwtToken(),
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

    const res = await server.post("/api/oauthClients.create", {
      body: {
        token: admin.getJwtToken(),
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

    const res = await server.post("/api/oauthClients.update", {
      body: {
        token: admin.getJwtToken(),
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

    const res = await server.post("/api/oauthClients.rotate_secret", {
      body: {
        token: admin.getJwtToken(),
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

    const res = await server.post("/api/oauthClients.delete", {
      body: {
        token: admin.getJwtToken(),
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
