import TestServer from "fetch-test-server";
import sharedEnv from "@shared/env";
import env from "@server/env";
import webService from "@server/services/web";
import { buildUser, buildTeam } from "@server/test/factories";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());
beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#auth.info", () => {
  it("should return current authentication", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const res = await server.post("/api/auth.info", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.user.name).toBe(user.name);
    expect(body.data.team.name).toBe(team.name);
    expect(body.data.team.allowedDomains).toEqual([]);
  });

  it("should require the team to not be deleted", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
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
    env.DEPLOYMENT = "hosted";

    const res = await server.post("/api/auth.config");
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(2);
    expect(body.data.providers[0].name).toBe("Slack");
    expect(body.data.providers[1].name).toBe("Google");
  });

  it("should return available providers for team subdomain", async () => {
    env.URL = sharedEnv.URL = "http://localoutline.com";
    env.SUBDOMAINS_ENABLED = sharedEnv.SUBDOMAINS_ENABLED = true;
    env.DEPLOYMENT = "hosted";

    await buildTeam({
      guestSignin: false,
      subdomain: "example",
      authenticationProviders: [
        {
          name: "slack",
          providerId: "123",
        },
      ],
    });
    const res = await server.post("/api/auth.config", {
      headers: {
        host: `example.localoutline.com`,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(1);
    expect(body.data.providers[0].name).toBe("Slack");
  });

  it("should return available providers for team custom domain", async () => {
    env.DEPLOYMENT = "hosted";

    await buildTeam({
      guestSignin: false,
      domain: "docs.mycompany.com",
      authenticationProviders: [
        {
          name: "slack",
          providerId: "123",
        },
      ],
    });
    const res = await server.post("/api/auth.config", {
      headers: {
        host: "docs.mycompany.com",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(1);
    expect(body.data.providers[0].name).toBe("Slack");
  });

  it("should return email provider for team when guest signin enabled", async () => {
    env.URL = sharedEnv.URL = "http://localoutline.com";
    env.DEPLOYMENT = "hosted";

    await buildTeam({
      guestSignin: true,
      subdomain: "example",
      authenticationProviders: [
        {
          name: "slack",
          providerId: "123",
        },
      ],
    });
    const res = await server.post("/api/auth.config", {
      headers: {
        host: "example.localoutline.com",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(2);
    expect(body.data.providers[0].name).toBe("Slack");
    expect(body.data.providers[1].name).toBe("Email");
  });

  it("should not return provider when disabled", async () => {
    env.URL = sharedEnv.URL = "http://localoutline.com";
    env.DEPLOYMENT = "hosted";

    await buildTeam({
      guestSignin: false,
      subdomain: "example",
      authenticationProviders: [
        {
          name: "slack",
          providerId: "123",
          enabled: false,
        },
      ],
    });
    const res = await server.post("/api/auth.config", {
      headers: {
        host: "example.localoutline.com",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(0);
  });

  describe("self hosted", () => {
    it("should return all configured providers but respect email setting", async () => {
      env.DEPLOYMENT = "";
      await buildTeam({
        guestSignin: false,
        authenticationProviders: [
          {
            name: "slack",
            providerId: "123",
          },
        ],
      });
      const res = await server.post("/api/auth.config");
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.providers.length).toBe(2);
      expect(body.data.providers[0].name).toBe("Google");
      expect(body.data.providers[1].name).toBe("Slack");
    });

    it("should return email provider for team when guest signin enabled", async () => {
      env.DEPLOYMENT = "";
      await buildTeam({
        guestSignin: true,
        authenticationProviders: [
          {
            name: "slack",
            providerId: "123",
          },
        ],
      });
      const res = await server.post("/api/auth.config");
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.providers.length).toBe(3);
      expect(body.data.providers[0].name).toBe("Slack");
      expect(body.data.providers[1].name).toBe("Google");
      expect(body.data.providers[2].name).toBe("Email");
    });
  });
});
