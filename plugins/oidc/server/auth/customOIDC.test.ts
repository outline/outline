import { randomUUID } from "node:crypto";
import type { AuthenticationProvider } from "@server/models";
import Redis from "@server/storage/redis";
import { buildTeam } from "@server/test/factories";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import { getTestServer, setSelfHosted } from "@server/test/support";

const server = getTestServer();

beforeEach(setSelfHosted);

const config = {
  displayName: "Okta",
  authorizationUrl: "https://auth.example.com/authorize",
  tokenUrl: "https://auth.example.com/token",
  userInfoUrl: "https://auth.example.com/userinfo",
  clientId: "custom-client-id",
  clientSecret: "custom-client-secret",
  scopes: "openid profile email",
  usernameClaim: "preferred_username",
};

describe("custom oidc", () => {
  it("should redirect to the configured authorization endpoint", async () => {
    const team = await buildTeam();
    const provider = await team.$create<AuthenticationProvider>(
      "authenticationProvider",
      { name: "oidc-custom", providerId: randomUUID(), config }
    );

    const res = await server.get(`/auth/oidc-custom/${provider.id}`, {
      redirect: "manual",
    });
    expect(res.status).toEqual(302);

    const location = new URL(res.headers.get("location")!);
    expect(location.origin + location.pathname).toEqual(
      config.authorizationUrl
    );
    expect(location.searchParams.get("client_id")).toEqual(config.clientId);
    expect(location.searchParams.get("scope")).toEqual(config.scopes);
    expect(location.searchParams.get("redirect_uri")).toMatch(
      /\/auth\/oidc-custom\.callback$/
    );
    expect(res.headers.get("set-cookie")).toContain(
      `oidc_custom_provider=${provider.id}`
    );
  });

  it("should not sign in with an unknown provider", async () => {
    const res = await server.get(`/auth/oidc-custom/${randomUUID()}`, {
      redirect: "manual",
    });
    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).toContain("notice=auth-error");
  });

  it("should not sign in with a provider of another type", async () => {
    const team = await buildTeam();
    const [provider] = await team.$get("authenticationProviders");

    const res = await server.get(`/auth/oidc-custom/${provider.id}`, {
      redirect: "manual",
    });
    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).toContain("notice=auth-error");
  });

  it("should not complete a callback without a started sign-in", async () => {
    const res = await server.get(
      "/auth/oidc-custom.callback?code=123&state=abc",
      { redirect: "manual" }
    );
    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).toContain("notice=auth-error");
  });

  describe("logout", () => {
    it("should redirect to the end session endpoint of the provider", async () => {
      const team = await buildTeam();
      const provider = await team.$create<AuthenticationProvider>(
        "authenticationProvider",
        {
          name: "oidc-custom",
          providerId: randomUUID(),
          config: { ...config, logoutUrl: "https://auth.example.com/logout" },
        }
      );
      const sessionId = randomUUID();
      await Redis.defaultClient.set(
        RedisPrefixHelper.getLogoutTokenKey("oidc-custom", sessionId),
        JSON.stringify({
          authenticationProviderId: provider.id,
          idToken: "fake-id-token",
        })
      );

      const res = await server.get("/auth/oidc-custom.logout", {
        redirect: "manual",
        headers: { Cookie: `oidc-customSession=${sessionId}` },
      });
      expect(res.status).toEqual(302);

      const location = new URL(res.headers.get("location")!);
      expect(location.origin + location.pathname).toEqual(
        "https://auth.example.com/logout"
      );
      expect(location.searchParams.get("id_token_hint")).toEqual(
        "fake-id-token"
      );
      expect(location.searchParams.get("client_id")).toEqual(config.clientId);
    });

    it("should redirect home without a stored session", async () => {
      const res = await server.get("/auth/oidc-custom.logout", {
        redirect: "manual",
      });
      expect(res.status).toEqual(302);
      expect(new URL(res.headers.get("location")!).pathname).toEqual("/");
    });
  });
});
