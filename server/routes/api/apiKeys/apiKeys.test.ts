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
        scope: ["/api/documents.list", "*.info", "users.*"],
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("My API Key");
    expect(body.data.scope).toEqual([
      "/api/documents.list",
      "/api/*.info",
      "/api/users.*",
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

  it("should require authentication", async () => {
    const res = await server.post("/api/apiKeys.delete");
    expect(res.status).toEqual(401);
  });
});
