import TestServer from "fetch-test-server";
import EmailTask from "@server/queues/tasks/EmailTask";
import webService from "@server/services/web";
import { buildUser, buildGuestUser, buildTeam } from "@server/test/factories";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());

beforeEach(async () => {
  await flushdb();
});
afterAll(() => server.close());

describe("email", () => {
  it("should require email param", async () => {
    const res = await server.post("/auth/email", {
      body: {},
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("validation_error");
    expect(body.ok).toEqual(false);
  });

  it("should respond with redirect location when user is SSO enabled", async () => {
    const spy = jest.spyOn(EmailTask, "schedule");
    const user = await buildUser();
    const res = await server.post("/auth/email", {
      body: {
        email: user.email,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.redirect).toMatch("slack");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should respond with redirect location when user is SSO enabled on another subdomain", async () => {
    process.env.URL = "http://localoutline.com";
    process.env.SUBDOMAINS_ENABLED = "true";
    const user = await buildUser();
    const spy = jest.spyOn(EmailTask, "schedule");
    await buildTeam({
      subdomain: "example",
    });
    const res = await server.post("/auth/email", {
      body: {
        email: user.email,
      },
      headers: {
        host: "example.localoutline.com",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.redirect).toMatch("slack");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should respond with success when user is not SSO enabled", async () => {
    const spy = jest.spyOn(EmailTask, "schedule");
    const user = await buildGuestUser();
    const res = await server.post("/auth/email", {
      body: {
        email: user.email,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should respond with success regardless of whether successful to prevent crawling email logins", async () => {
    const spy = jest.spyOn(EmailTask, "schedule");
    const res = await server.post("/auth/email", {
      body: {
        email: "user@example.com",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  describe("with multiple users matching email", () => {
    it("should default to current subdomain with SSO", async () => {
      const spy = jest.spyOn(EmailTask, "schedule");
      process.env.URL = "http://localoutline.com";
      process.env.SUBDOMAINS_ENABLED = "true";
      const email = "sso-user@example.org";
      const team = await buildTeam({
        subdomain: "example",
      });
      await buildGuestUser({
        email,
      });
      await buildUser({
        email,
        teamId: team.id,
      });
      const res = await server.post("/auth/email", {
        body: {
          email,
        },
        headers: {
          host: "example.localoutline.com",
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.redirect).toMatch("slack");
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should default to current subdomain with guest email", async () => {
      const spy = jest.spyOn(EmailTask, "schedule");
      process.env.URL = "http://localoutline.com";
      process.env.SUBDOMAINS_ENABLED = "true";
      const email = "guest-user@example.org";
      const team = await buildTeam({
        subdomain: "example",
      });
      await buildUser({
        email,
      });
      await buildGuestUser({
        email,
        teamId: team.id,
      });
      const res = await server.post("/auth/email", {
        body: {
          email,
        },
        headers: {
          host: "example.localoutline.com",
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.success).toEqual(true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should default to custom domain with SSO", async () => {
      const spy = jest.spyOn(EmailTask, "schedule");
      const email = "sso-user-2@example.org";
      const team = await buildTeam({
        domain: "docs.mycompany.com",
      });
      await buildGuestUser({
        email,
      });
      await buildUser({
        email,
        teamId: team.id,
      });
      const res = await server.post("/auth/email", {
        body: {
          email,
        },
        headers: {
          host: "docs.mycompany.com",
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.redirect).toMatch("slack");
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should default to custom domain with guest email", async () => {
      const spy = jest.spyOn(EmailTask, "schedule");
      const email = "guest-user-2@example.org";
      const team = await buildTeam({
        domain: "docs.mycompany.com",
      });
      await buildUser({
        email,
      });
      await buildGuestUser({
        email,
        teamId: team.id,
      });
      const res = await server.post("/auth/email", {
        body: {
          email,
        },
        headers: {
          host: "docs.mycompany.com",
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.success).toEqual(true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
