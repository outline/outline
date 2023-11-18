import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import { buildUser, buildTeam } from "@server/test/factories";
import { getTestServer, setSelfHosted } from "@server/test/support";

const mockTeamInSessionId = uuidv4();

jest.mock("@server/utils/authentication", () => ({
  getSessionsInCookie() {
    return { [mockTeamInSessionId]: {} };
  },
}));

const server = getTestServer();

describe("#auth.info", () => {
  it("should return current authentication", async () => {
    const team = await buildTeam();
    const team2 = await buildTeam();
    const team3 = await buildTeam({
      id: mockTeamInSessionId,
    });

    const user = await buildUser({ teamId: team.id });
    await buildUser();
    await buildUser({
      teamId: team2.id,
      email: user.email,
    });
    const res = await server.post("/api/auth.info", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);

    const availableTeamIds = body.data.availableTeams.map((t: any) => t.id);

    expect(availableTeamIds.length).toEqual(3);
    expect(availableTeamIds).toContain(team.id);
    expect(availableTeamIds).toContain(team2.id);
    expect(availableTeamIds).toContain(team3.id);
    expect(body.data.user.name).toBe(user.name);
    expect(body.data.team.name).toBe(team.name);
    expect(body.data.team.allowedDomains).toEqual([]);
  });

  it("should require the team to not be deleted", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await team.destroy();
    const res = await server.post("/api/auth.info", {
      body: {
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(401);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/auth.info");
    expect(res.status).toEqual(401);
  });
});

describe("#auth.delete", () => {
  it("should make the access token unusable", async () => {
    const user = await buildUser();
    const res = await server.post("/api/auth.delete", {
      body: {
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(200);

    const res2 = await server.post("/api/auth.info", {
      body: {
        token: user.getJwtToken(),
      },
    });
    expect(res2.status).toEqual(401);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/auth.delete");
    expect(res.status).toEqual(401);
  });
});

describe("#auth.config", () => {
  it("should return available SSO providers", async () => {
    const res = await server.post("/api/auth.config");
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(3);
    expect(body.data.providers[0].name).toBe("Slack");
    expect(body.data.providers[1].name).toBe("OpenID Connect");
    expect(body.data.providers[2].name).toBe("Google");
  });

  it("should return available providers for team subdomain", async () => {
    const subdomain = faker.internet.domainWord();
    await buildTeam({
      guestSignin: false,
      subdomain,
      authenticationProviders: [
        {
          name: "slack",
          providerId: uuidv4(),
        },
      ],
    });
    const res = await server.post("/api/auth.config", {
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(1);
    expect(body.data.providers[0].name).toBe("Slack");
  });

  it("should return available providers for team custom domain", async () => {
    const domain = faker.internet.domainName();
    await buildTeam({
      guestSignin: false,
      domain,
      authenticationProviders: [
        {
          name: "slack",
          providerId: uuidv4(),
        },
      ],
    });
    const res = await server.post("/api/auth.config", {
      headers: {
        host: domain,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(1);
    expect(body.data.providers[0].name).toBe("Slack");
  });

  it("should return email provider for team when guest signin enabled", async () => {
    const subdomain = faker.internet.domainWord();
    await buildTeam({
      guestSignin: true,
      subdomain,
      authenticationProviders: [
        {
          name: "slack",
          providerId: uuidv4(),
        },
      ],
    });
    const res = await server.post("/api/auth.config", {
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(2);
    expect(body.data.providers[0].name).toBe("Slack");
    expect(body.data.providers[1].name).toBe("Email");
  });

  it("should not return provider when disabled", async () => {
    const subdomain = faker.internet.domainWord();
    await buildTeam({
      guestSignin: false,
      subdomain,
      authenticationProviders: [
        {
          name: "slack",
          providerId: uuidv4(),
          enabled: false,
        },
      ],
    });
    const res = await server.post("/api/auth.config", {
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(0);
  });

  describe.skip("self hosted", () => {
    beforeEach(setSelfHosted);

    it("should return all configured providers but respect email setting", async () => {
      await buildTeam({
        guestSignin: false,
        authenticationProviders: [
          {
            name: "slack",
            providerId: uuidv4(),
          },
        ],
      });
      const res = await server.post("/api/auth.config");
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.providers.length).toBe(3);
      expect(body.data.providers[0].name).toBe("Google");
      expect(body.data.providers[1].name).toBe("OpenID Connect");
      expect(body.data.providers[2].name).toBe("Slack");
    });

    it("should return email provider for team when guest signin enabled", async () => {
      await buildTeam({
        guestSignin: true,
        authenticationProviders: [
          {
            name: "slack",
            providerId: uuidv4(),
          },
        ],
      });
      const res = await server.post("/api/auth.config");
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.providers.length).toBe(4);
      expect(body.data.providers[0].name).toBe("Slack");
      expect(body.data.providers[1].name).toBe("OpenID Connect");
      expect(body.data.providers[2].name).toBe("Google");
      expect(body.data.providers[3].name).toBe("Email");
    });
  });
});
