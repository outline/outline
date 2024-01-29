import { faker } from "@faker-js/faker";
import SigninEmail from "@server/emails/templates/SigninEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import { AuthenticationProvider } from "@server/models";
import { buildUser, buildGuestUser, buildTeam } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("email", () => {
  it("should fail with status 400 bad request if email is invalid", async () => {
    const res = await server.post("/auth/email", {
      body: { email: "invalid" },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("email: Invalid email");
  });

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
    const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
    const subdomain = faker.internet.domainWord();
    const team = await buildTeam({ subdomain });
    const user = await buildUser({ teamId: team.id });
    const res = await server.post("/auth/email", {
      body: {
        email: user.email,
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.redirect).toMatch("slack");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should respond with success and email to be sent when user has SSO but disabled", async () => {
    const spy = jest.spyOn(SigninEmail.prototype, "schedule");
    const subdomain = faker.internet.domainWord();
    const team = await buildTeam({ subdomain });
    const user = await buildUser({ teamId: team.id });

    // Disable all the auth providers
    await AuthenticationProvider.update(
      {
        enabled: false,
      },
      {
        where: {
          teamId: team.id,
          enabled: true,
        },
      }
    );

    const res = await server.post("/auth/email", {
      body: {
        email: user.email,
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should not send email when user is on another subdomain but respond with success", async () => {
    const user = await buildUser();
    const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
    const subdomain = faker.internet.domainWord();
    await buildTeam({ subdomain });
    const res = await server.post("/auth/email", {
      body: {
        email: user.email,
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should respond with success and email to be sent when user is not SSO enabled", async () => {
    const spy = jest.spyOn(SigninEmail.prototype, "schedule");
    const subdomain = faker.internet.domainWord();
    const team = await buildTeam({ subdomain });
    const user = await buildGuestUser({
      teamId: team.id,
    });
    const res = await server.post("/auth/email", {
      body: {
        email: user.email,
      },
      headers: {
        host: `${subdomain}.outline.dev`,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should respond with success regardless of whether successful to prevent crawling email logins", async () => {
    const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
    const subdomain = faker.internet.domainWord();
    await buildTeam({ subdomain });
    const res = await server.post("/auth/email", {
      body: {
        email: "user@example.com",
      },
      headers: {
        host: `${subdomain}.outline.dev`,
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
      const spy = jest.spyOn(SigninEmail.prototype, "schedule");
      const email = "sso-user@example.org";
      const subdomain = faker.internet.domainWord();
      const team = await buildTeam({
        subdomain,
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
          host: `${subdomain}.outline.dev`,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.redirect).toMatch("slack");
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should default to current subdomain with guest email", async () => {
      const spy = jest.spyOn(SigninEmail.prototype, "schedule");
      const email = "guest-user@example.org";
      const subdomain = faker.internet.domainWord();
      const team = await buildTeam({
        subdomain,
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
          host: `${subdomain}.outline.dev`,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.success).toEqual(true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should default to custom domain with SSO", async () => {
      const spy = jest.spyOn(WelcomeEmail.prototype, "schedule");
      const email = "sso-user-2@example.org";
      const domain = faker.internet.domainName();
      const team = await buildTeam({
        domain,
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
          host: domain,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.redirect).toMatch("slack");
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should default to custom domain with guest email", async () => {
      const spy = jest.spyOn(SigninEmail.prototype, "schedule");
      const email = "guest-user-2@example.org";
      const domain = faker.internet.domainName();
      const team = await buildTeam({
        domain,
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
          host: domain,
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
