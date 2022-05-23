import TestServer from "fetch-test-server";
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

describe("#auth.config", () => {
  it("should return available SSO providers", async () => {
    const res = await server.post("/api/auth.config");
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.providers.length).toBe(2);
    expect(body.data.providers[0].name).toBe("Slack");
    expect(body.data.providers[1].name).toBe("Google");
  });

  it("should return available providers for team subdomain", async () => {
    env.URL = "http://localoutline.com";
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
    env.URL = "http://localoutline.com";
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
    env.URL = "http://localoutline.com";
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
    it("should return available providers for team", async () => {
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
      expect(body.data.providers.length).toBe(1);
      expect(body.data.providers[0].name).toBe("Slack");
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
      expect(body.data.providers.length).toBe(2);
      expect(body.data.providers[0].name).toBe("Slack");
      expect(body.data.providers[1].name).toBe("Email");
    });
  });
});
