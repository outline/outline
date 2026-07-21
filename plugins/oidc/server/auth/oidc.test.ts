import Redis from "@server/storage/redis";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("oidc", () => {
  it("should pass query params along with auth redirect", async () => {
    const res = await server.get("/auth/oidc?myParam=someParam", {
      redirect: "manual",
    });
    expect(res.headers.get("location")).not.toBeNull();
    const redirectLocation = new URL(res.headers.get("location")!);
    expect(res.status).toEqual(302);
    expect(redirectLocation.searchParams.get("myParam")).toEqual("someParam");
  });

  describe("logout", () => {
    it("should redirect to the provider with a spec-compliant logout request", async () => {
      const res = await server.get("/auth/oidc.logout", {
        redirect: "manual",
      });
      expect(res.status).toEqual(302);
      const redirectLocation = new URL(res.headers.get("location")!);
      expect(redirectLocation.origin + redirectLocation.pathname).toEqual(
        "http://localhost/logout"
      );
      expect(redirectLocation.searchParams.get("client_id")).toEqual(
        "client-id"
      );
      expect(
        redirectLocation.searchParams.get("post_logout_redirect_uri")
      ).toEqual("http://localhost:3000");
    });

    it("should include the id_token_hint when present", async () => {
      const sessionId = "test-session-id";
      await Redis.defaultClient.set(
        RedisPrefixHelper.getLogoutTokenKey("oidc", sessionId),
        "fake-id-token"
      );

      const res = await server.get("/auth/oidc.logout", {
        redirect: "manual",
        headers: {
          Cookie: `oidcSession=${sessionId}`,
        },
      });
      expect(res.status).toEqual(302);
      const redirectLocation = new URL(res.headers.get("location")!);
      expect(redirectLocation.searchParams.get("id_token_hint")).toEqual(
        "fake-id-token"
      );
      expect(res.headers.get("set-cookie")).toContain(
        "oidcSession=; path=/auth/oidc.logout;"
      );
      // The token is consumed from the server-side store on logout.
      expect(
        await Redis.defaultClient.get(
          RedisPrefixHelper.getLogoutTokenKey("oidc", sessionId)
        )
      ).toBeNull();
    });
  });
});
