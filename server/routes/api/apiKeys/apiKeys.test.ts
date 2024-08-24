import { buildApiKey, buildUser } from "@server/test/factories";
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

  it("should require authentication", async () => {
    const res = await server.post("/api/apiKeys.create");
    expect(res.status).toEqual(401);
  });
});

describe("#apiKeys.list", () => {
  it("should return api keys of a user", async () => {
    const now = new Date();
    const user = await buildUser();
    await buildApiKey({
      name: "My API Key",
      userId: user.id,
      expiresAt: now,
    });

    const res = await server.post("/api/apiKeys.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data[0].name).toEqual("My API Key");
    expect(body.data[0].expiresAt).toEqual(now.toISOString());
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
