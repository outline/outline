import { v4 as uuidv4 } from "uuid";
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
      providerId: uuidv4(),
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
