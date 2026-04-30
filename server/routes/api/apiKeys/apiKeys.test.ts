import { buildAdmin, buildApiKey, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#apiKeys.create", () => {
  it("should allow creating an api key with expiry", async () => {
    const now = new Date();
    const user = await buildUser();

    const res = await server.post("/api/apiKeys.create", {
      body: {
        token: user.getJwtToken(),
        name: "My API Key",
        expiresAt: now.toISOString(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("My API Key");
    expect(body.data.expiresAt).toEqual(now.toISOString());
    expect(body.data.lastActiveAt).toBeNull();
  });

  it("should allow creating an api key without expiry", async () => {
    const user = await buildUser();

    const res = await server.post("/api/apiKeys.create", {
      body: {
        token: user.getJwtToken(),
        name: "My API Key",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("My API Key");
    expect(body.data.expiresAt).toBeNull();
    expect(body.data.lastActiveAt).toBeNull();
  });

  it("should allow creating an api key with scopes", async () => {
    const user = await buildUser();

    const res = await server.post("/api/apiKeys.create", {
      body: {
        token: user.getJwtToken(),
        name: "My API Key",
        scope: [
          "/api/documents.list",
          "/revisions.list",
          "*.info",
          "users.*",
          "collections:read",
          "read",
          "write",
        ],
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("My API Key");
    expect(body.data.scope).toEqual([
      "/api/documents.list",
      "/api/revisions.list",
      "/api/*.info",
      "/api/users.*",
      "collections:read",
      "read",
      "write",
    ]);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/apiKeys.create");
    expect(res.status).toEqual(401);
  });
});

describe("#apiKeys.list", () => {
  it("should return api keys of the specified user", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    await buildApiKey({ userId: user.id });

    const res = await server.post("/api/apiKeys.list", {
      body: {
        userId: user.id,
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should return api keys of the specified user for admin", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    await buildApiKey({ userId: user.id });
    await buildApiKey({ userId: admin.id });

    const res = await server.post("/api/apiKeys.list", {
      body: {
        userId: admin.id,
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should return api keys of all users for admin", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({ teamId: admin.teamId });
    await buildApiKey({ userId: admin.id });
    await buildApiKey({ userId: user.id });
    await buildApiKey();

    const res = await server.post("/api/apiKeys.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
  });

  it("should filter api keys by query", async () => {
    const admin = await buildAdmin();
    await buildApiKey({ userId: admin.id, name: "Production Key" });
    await buildApiKey({ userId: admin.id, name: "Staging Key" });
    await buildApiKey({ userId: admin.id, name: "Development Token" });

    const res = await server.post("/api/apiKeys.list", {
      body: {
        token: admin.getJwtToken(),
        query: "key",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(
      body.data.every((apiKey: { name: string }) =>
        apiKey.name.toLowerCase().includes("key")
      )
    ).toBe(true);
  });

  it("should filter api keys by query case-insensitively", async () => {
    const admin = await buildAdmin();
    await buildApiKey({ userId: admin.id, name: "Production Key" });
    await buildApiKey({ userId: admin.id, name: "Staging Key" });

    const res = await server.post("/api/apiKeys.list", {
      body: {
        token: admin.getJwtToken(),
        query: "PRODUCTION",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].name).toEqual("Production Key");
  });

  it("should return empty array when query matches no api keys", async () => {
    const admin = await buildAdmin();
    await buildApiKey({ userId: admin.id, name: "Production Key" });

    const res = await server.post("/api/apiKeys.list", {
      body: {
        token: admin.getJwtToken(),
        query: "nonexistent",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/apiKeys.list");
    expect(res.status).toEqual(401);
  });
});

describe("#apiKeys.delete", () => {
  it("should delete users api key", async () => {
    const user = await buildUser();
    const apiKey = await buildApiKey({
      name: "My API Key",
      userId: user.id,
    });

    const res = await server.post("/api/apiKeys.delete", {
      body: {
        token: user.getJwtToken(),
        id: apiKey.id,
      },
    });

    expect(res.status).toEqual(200);
  });

  it("should not allow deleting another user's api key", async () => {
    const user = await buildUser();
    const otherUser = await buildUser({ teamId: user.teamId });
    const apiKey = await buildApiKey({
      name: "Other User's API Key",
      userId: otherUser.id,
    });

    const res = await server.post("/api/apiKeys.delete", {
      body: {
        token: user.getJwtToken(),
        id: apiKey.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow admin to delete another user's api key", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });

    const apiKey = await buildApiKey({
      name: "User's API Key",
      userId: user.id,
    });

    const res = await server.post("/api/apiKeys.delete", {
      body: {
        token: admin.getJwtToken(),
        id: apiKey.id,
      },
    });

    expect(res.status).toEqual(200);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/apiKeys.delete");
    expect(res.status).toEqual(401);
  });
});
