import { randomUUID } from "crypto";
import { buildUser, buildAdmin, buildTeam } from "@server/test/factories";
import { getTestServer, setSelfHosted } from "@server/test/support";

const server = getTestServer();

beforeEach(setSelfHosted);

describe("#authenticationProviders.info", () => {
  it("should return auth provider", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const authenticationProviders = await team.$get("authenticationProviders");
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
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.update).toBeTruthy();
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const user = await buildUser();
    const authenticationProviders = await team.$get("authenticationProviders");
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
    const authenticationProviders = await team.$get("authenticationProviders");
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
    const user = await buildAdmin({
      teamId: team.id,
    });
    const authenticationProviders = await team.$get("authenticationProviders");
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
    const user = await buildAdmin({
      teamId: team.id,
    });
    const googleProvider = await team.$create("authenticationProvider", {
      name: "google",
      providerId: randomUUID(),
    });
    const res = await server.post("/api/authenticationProviders.update", {
      body: {
        id: googleProvider.id,
        isEnabled: false,
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("google");
    expect(body.data.isEnabled).toBe(false);
    expect(body.data.isConnected).toBe(true);
  });

  it("should prevent concurrent disable operations leaving zero enabled providers", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });

    // Create a second authentication provider (team starts with slack)
    const googleProvider = await team.$create("authenticationProvider", {
      name: "google",
      providerId: randomUUID(),
    });

    const authenticationProviders = await team.$get("authenticationProviders");
    const slackProvider = authenticationProviders.find(
      (p) => p.name === "slack"
    );
    expect(slackProvider).toBeDefined();

    // Attempt to disable both providers concurrently
    const [res1, res2] = await Promise.all([
      server.post("/api/authenticationProviders.update", {
        body: {
          id: slackProvider!.id,
          isEnabled: false,
          token: user.getJwtToken(),
        },
      }),
      server.post("/api/authenticationProviders.update", {
        body: {
          id: googleProvider.id,
          isEnabled: false,
          token: user.getJwtToken(),
        },
      }),
    ]);

    // At least one request should fail
    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(400);

    // Verify at least one provider remains enabled
    const finalProviders = await team.$get("authenticationProviders");
    const enabledCount = finalProviders.filter((p) => p.enabled).length;
    expect(enabledCount).toBeGreaterThanOrEqual(1);
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const authenticationProviders = await team.$get("authenticationProviders");
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
    const authenticationProviders = await team.$get("authenticationProviders");
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
    const user = await buildAdmin({
      teamId: team.id,
    });
    const res = await server.post("/api/authenticationProviders.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(3);
    expect(body.data[0].name).toBe("slack");
    expect(body.data[0].isEnabled).toBe(true);
    expect(body.data[0].isConnected).toBe(true);
    expect(body.data[1].name).toBe("google");
    expect(body.data[1].isEnabled).toBe(false);
    expect(body.data[1].isConnected).toBe(false);
    expect(body.data[2].name).toBe("oidc");
    expect(body.data[2].isEnabled).toBe(false);
    expect(body.data[2].isConnected).toBe(false);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/authenticationProviders.list");
    expect(res.status).toEqual(401);
  });
});
