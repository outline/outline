import { addMonths } from "date-fns";
import { buildUser, buildCollection } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { getJWTPayload } from "@server/utils/jwt";

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
