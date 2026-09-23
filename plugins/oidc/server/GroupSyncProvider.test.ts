import { http, HttpResponse } from "msw";
import { server } from "@server/test/msw";
import env from "./env";
import { OIDCGroupSyncProvider } from "./GroupSyncProvider";

const userInfoURL = "https://idp.example.com/userinfo";

describe("OIDCGroupSyncProvider", () => {
  const originalUserInfoURL = env.OIDC_USERINFO_URI;

  beforeEach(() => {
    env.OIDC_USERINFO_URI = userInfoURL;
  });

  afterEach(() => {
    env.OIDC_USERINFO_URI = originalUserInfoURL;
  });

  it("returns the groups listed in the configured claim", async () => {
    server.use(
      http.get(userInfoURL, () =>
        HttpResponse.json({
          sub: "user-1",
          groups: ["Engineering", "Design"],
        })
      )
    );

    const groups = await OIDCGroupSyncProvider.fetchUserGroups("access-token", {
      groupSyncEnabled: true,
      groupClaim: "groups",
    });

    expect(groups).toEqual([
      { id: "Engineering", name: "Engineering" },
      { id: "Design", name: "Design" },
    ]);
  });

  it("returns no groups when the provider omits the claim", async () => {
    server.use(
      http.get(userInfoURL, () => HttpResponse.json({ sub: "user-1" }))
    );

    const groups = await OIDCGroupSyncProvider.fetchUserGroups("access-token", {
      groupSyncEnabled: true,
      groupClaim: "groups",
    });

    expect(groups).toEqual([]);
  });
});
