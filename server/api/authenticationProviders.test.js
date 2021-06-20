// @flow
import TestServer from "fetch-test-server";
import { v4 as uuidv4 } from "uuid";
import app from "../app";
import { buildUser, buildAdmin, buildTeam } from "../test/factories";
import { flushdb } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#authenticationProviders.info", () => {
  it("should return auth provider", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const authenticationProviders = await team.getAuthenticationProviders();

    const res = await server.post("/api/authenticationProviders.info", {
      body: {
        id: authenticationProviders[0].id,
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("slack");
    expect(body.data.isEnabled).toBe(true);
    expect(body.data.isConnected).toBe(true);
    expect(body.policies[0].abilities.read).toBe(true);
    expect(body.policies[0].abilities.update).toBe(false);
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const user = await buildUser();
    const authenticationProviders = await team.getAuthenticationProviders();

    const res = await server.post("/api/authenticationProviders.info", {
      body: {
        id: authenticationProviders[0].id,
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const team = await buildTeam();
    const authenticationProviders = await team.getAuthenticationProviders();

    const res = await server.post("/api/authenticationProviders.info", {
      body: {
        id: authenticationProviders[0].id,
      },
    });
    expect(res.status).toEqual(401);
  });
});

describe("#authenticationProviders.update", () => {
  it("should not allow admins to disable when last authentication provider", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const authenticationProviders = await team.getAuthenticationProviders();

    const res = await server.post("/api/authenticationProviders.update", {
      body: {
        id: authenticationProviders[0].id,
        isEnabled: false,
        token: user.getJwtToken(),
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should allow admins to disable", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    await team.createAuthenticationProvider({
      name: "google",
      providerId: uuidv4(),
    });
    const authenticationProviders = await team.getAuthenticationProviders();

    const res = await server.post("/api/authenticationProviders.update", {
      body: {
        id: authenticationProviders[0].id,
        isEnabled: false,
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("slack");
    expect(body.data.isEnabled).toBe(false);
    expect(body.data.isConnected).toBe(true);
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const authenticationProviders = await team.getAuthenticationProviders();

    const res = await server.post("/api/authenticationProviders.update", {
      body: {
        id: authenticationProviders[0].id,
        isEnabled: false,
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const team = await buildTeam();
    const authenticationProviders = await team.getAuthenticationProviders();

    const res = await server.post("/api/authenticationProviders.update", {
      body: {
        id: authenticationProviders[0].id,
        isEnabled: false,
      },
    });
    expect(res.status).toEqual(401);
  });
});

describe("#authenticationProviders.list", () => {
  it("should return enabled and available auth providers", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/authenticationProviders.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.authenticationProviders.length).toBe(2);
    expect(body.data.authenticationProviders[0].name).toBe("slack");
    expect(body.data.authenticationProviders[0].isEnabled).toBe(true);
    expect(body.data.authenticationProviders[0].isConnected).toBe(true);
    expect(body.data.authenticationProviders[1].name).toBe("google");
    expect(body.data.authenticationProviders[1].isEnabled).toBe(false);
    expect(body.data.authenticationProviders[1].isConnected).toBe(false);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/authenticationProviders.list");
    expect(res.status).toEqual(401);
  });
});
