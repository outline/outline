import { Scope } from "@shared/types";
import { OAuthAuthentication } from "@server/models";
import { buildOAuthAuthentication, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#oauth.revoke", () => {
  it("should revoke access token", async () => {
    const user = await buildUser();
    const auth = await buildOAuthAuthentication({ user, scope: [Scope.Read] });

    const res = await server.post("/oauth/revoke", {
      body: {
        token: auth.accessToken,
      },
    });
    expect(res.status).toEqual(200);

    const found = await OAuthAuthentication.findByPk(auth.id);
    expect(found).toBeNull();
  });

  it("should revoke refresh token", async () => {
    const user = await buildUser();
    const auth = await buildOAuthAuthentication({ user, scope: [Scope.Read] });

    const res = await server.post("/oauth/revoke", {
      body: {
        token: auth.refreshToken,
      },
    });
    expect(res.status).toEqual(200);

    const found = await OAuthAuthentication.findByPk(auth.id);
    expect(found).toBeNull();
  });

  it("should not error with invalid token", async () => {
    const res = await server.post("/oauth/revoke", {
      body: {
        token: "invalid-token",
      },
    });
    expect(res.status).toEqual(200);
  });
});
