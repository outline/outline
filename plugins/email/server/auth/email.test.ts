import { faker } from "@faker-js/faker";
import SigninEmail from "@server/emails/templates/SigninEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import type { User } from "@server/models";
import { AuthenticationProvider, Event } from "@server/models";
import {
  buildInvite,
  buildUser,
  buildGuestUser,
  buildTeam,
  buildSubdomain,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("email", () => {
  it("should fail with status 400 bad request if email is invalid", async () => {
    const res = await server.post("/auth/email", {
      body: { email: "invalid" },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("email: Invalid email address");
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
    const spy = vi.spyOn(WelcomeEmail.prototype, "schedule");
    const subdomain = buildSubdomain();
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
    const spy = vi.spyOn(SigninEmail.prototype, "schedule");
    const subdomain = buildSubdomain();
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
    const spy = vi.spyOn(WelcomeEmail.prototype, "schedule");
    const subdomain = buildSubdomain();
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
    const spy = vi.spyOn(SigninEmail.prototype, "schedule");
    const subdomain = buildSubdomain();
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
    const spy = vi.spyOn(WelcomeEmail.prototype, "schedule");
    const subdomain = buildSubdomain();
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
      const spy = vi.spyOn(SigninEmail.prototype, "schedule");
      const email = "sso-user@example.org";
      const subdomain = buildSubdomain();
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
      const spy = vi.spyOn(SigninEmail.prototype, "schedule");
      const email = "guest-user@example.org";
      const subdomain = buildSubdomain();
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
      const spy = vi.spyOn(WelcomeEmail.prototype, "schedule");
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
      const spy = vi.spyOn(SigninEmail.prototype, "schedule");
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

  describe("email.callback", () => {
    /**
     * Completes an email sign-in using a verification code.
     *
     * @param user the user signing in.
     * @param subdomain the subdomain of the user's team.
     * @param cookie an optional cookie header to send with the request.
     * @returns the response of the callback.
     */
    async function signIn(user: User, subdomain: string, cookie?: string) {
      const code = await user.getEmailVerificationCode();
      const params = new URLSearchParams({
        code,
        email: user.email!,
        follow: "true",
      });
      return server.get(`/auth/email.callback?${params}`, {
        redirect: "manual",
        headers: {
          host: `${subdomain}.outline.dev`,
          ...(cookie ? { cookie } : {}),
        },
      });
    }

    it("should record invite_accepted when an invited user first signs in", async () => {
      const spy = vi.spyOn(WelcomeEmail.prototype, "schedule");
      const subdomain = buildSubdomain();
      const team = await buildTeam({ subdomain });
      const invite = await buildInvite({ teamId: team.id });

      await signIn(invite, subdomain);

      const event = await Event.findLatest({
        name: "users.invite_accepted",
        userId: invite.id,
      });
      expect(event?.teamId).toEqual(team.id);
      expect(event?.actorId).toEqual(invite.id);

      // Sent by UserCreatedProcessor in response to the event.
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should not attribute invite_accepted to the user of an existing session", async () => {
      const subdomain = buildSubdomain();
      const team = await buildTeam({ subdomain });
      const invite = await buildInvite({ teamId: team.id });
      const sessionUser = await buildUser();

      await signIn(
        invite,
        subdomain,
        `accessToken=${sessionUser.getSessionToken()}`
      );

      const event = await Event.findLatest({
        name: "users.invite_accepted",
        userId: invite.id,
      });
      expect(event?.teamId).toEqual(team.id);
      expect(event?.actorId).toEqual(invite.id);
    });

    it("should not accept an invite when the team is suspended", async () => {
      const subdomain = buildSubdomain();
      const team = await buildTeam({ subdomain, suspendedAt: new Date() });
      const invite = await buildInvite({ teamId: team.id });

      const res = await signIn(invite, subdomain);

      expect(res.status).toEqual(302);
      expect(res.headers.get("location")).toContain("notice=user-suspended");

      const event = await Event.findLatest({
        name: "users.invite_accepted",
        userId: invite.id,
      });
      expect(event).toBeNull();

      await invite.reload();
      expect(invite.isInvited).toEqual(true);
    });

    it("should not record invite_accepted for an active user", async () => {
      const subdomain = buildSubdomain();
      const team = await buildTeam({ subdomain });
      const user = await buildUser({ teamId: team.id });

      await signIn(user, subdomain);

      const signin = await Event.findLatest({
        name: "users.signin",
        userId: user.id,
      });
      expect(signin).not.toBeNull();

      const event = await Event.findLatest({
        name: "users.invite_accepted",
        userId: user.id,
      });
      expect(event).toBeNull();
    });
  });
});
