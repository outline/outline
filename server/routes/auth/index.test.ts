import { addMonths } from "date-fns";
import {
  buildAdmin,
  buildApiKey,
  buildUser,
  buildCollection,
} from "@server/test/factories";
import {
  getTestServer,
  setCloudHosted,
  setSelfHosted,
} from "@server/test/support";
import { getJWTPayload } from "@server/utils/jwt";
import { verifyOAuthState } from "@server/utils/oauthState";

const server = getTestServer();

describe("auth/redirect", () => {
  it("should redirect to home", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/auth/redirect?token=${user.getTransferToken()}`,
      {
        redirect: "manual",
      }
    );
    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).not.toBeNull();
    expect(res.headers.get("location")!.endsWith("/home")).toBeTruthy();
  });

  it("should redirect to first collection", async () => {
    const collection = await buildCollection();
    const user = await buildUser({
      teamId: collection.teamId,
    });
    const res = await server.get(
      `/auth/redirect?token=${user.getTransferToken()}`,
      {
        redirect: "manual",
      }
    );
    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).not.toBeNull();
    expect(res.headers.get("location")!.includes(collection.path)).toBeTruthy();
  });

  it("should issue a session token with an expiry", async () => {
    const user = await buildUser();
    const before = Date.now();
    const res = await server.get(
      `/auth/redirect?token=${user.getTransferToken()}`,
      {
        redirect: "manual",
      }
    );
    expect(res.status).toEqual(302);

    const cookie = res.headers.get("set-cookie");
    expect(cookie).not.toBeNull();
    const match = cookie!.match(/accessToken=([^;]+)/);
    expect(match).not.toBeNull();

    const payload = getJWTPayload(match![1]);
    expect(payload.type).toEqual("session");
    expect(payload.expiresAt).toBeDefined();

    const expiresAt = new Date(payload.expiresAt as string).getTime();
    const expectedMin = addMonths(before, 3).getTime() - 1000;
    const expectedMax = addMonths(Date.now(), 3).getTime() + 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt).toBeLessThanOrEqual(expectedMax);
  });

  it("should prevent token extension by rejecting JWT tokens", async () => {
    const user = await buildUser();
    const jwtToken = user.getSessionToken();

    const res = await server.get(`/auth/redirect?token=${jwtToken}`, {
      redirect: "manual",
    });

    expect(res.status).toEqual(401);
  });
});

describe("auth provider routes", () => {
  beforeEach(setSelfHosted);
  afterEach(setCloudHosted);

  it("should include the signed-in actor in the OAuth state", async () => {
    const user = await buildUser();
    const res = await server.get("/auth/google", {
      redirect: "manual",
      headers: {
        Cookie: `accessToken=${user.getSessionToken()}`,
      },
    });
    expect(res.status).toEqual(302);

    const location = new URL(res.headers.get("location") ?? "");
    const state = verifyOAuthState(location.searchParams.get("state") ?? "");
    expect(state.actorId).toEqual(user.id);
  });

  it("should not use an API key in the query as the actor", async () => {
    const admin = await buildAdmin();
    const apiKey = await buildApiKey({ userId: admin.id });
    const res = await server.get(`/auth/google?token=${apiKey.value}`, {
      redirect: "manual",
    });
    expect(res.status).toEqual(302);

    const location = new URL(res.headers.get("location") ?? "");
    const state = verifyOAuthState(location.searchParams.get("state") ?? "");
    expect(state.actorId).toBeUndefined();
  });

  it("should prefer the session cookie over a token in the query", async () => {
    const admin = await buildAdmin();
    const victim = await buildUser();
    const res = await server.get(
      `/auth/google?token=${admin.getTransferToken()}`,
      {
        redirect: "manual",
        headers: {
          Cookie: `accessToken=${victim.getSessionToken()}`,
        },
      }
    );
    expect(res.status).toEqual(302);

    const location = new URL(res.headers.get("location") ?? "");
    const state = verifyOAuthState(location.searchParams.get("state") ?? "");
    expect(state.actorId).toEqual(victim.id);
  });
});
