import { buildUser, buildCollection } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

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

  it("should prevent token extension by rejecting JWT tokens", async () => {
    const user = await buildUser();
    const jwtToken = user.getJwtToken();

    const res = await server.get(`/auth/redirect?token=${jwtToken}`, {
      redirect: "manual",
    });

    expect(res.status).toEqual(401);
  });

  it("should mint an accessToken JWT carrying an expiresAt claim", async () => {
    const user = await buildUser();
    const before = Date.now();

    const res = await server.get(
      `/auth/redirect?token=${user.getTransferToken()}`,
      {
        redirect: "manual",
      }
    );

    expect(res.status).toEqual(302);

    // Pull the `accessToken` cookie out of the Set-Cookie header(s).
    const setCookie = res.headers.get("set-cookie") || "";
    const match = setCookie.match(/accessToken=([^;,]+)/);
    expect(match).not.toBeNull();
    const jwt = match![1];

    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1], "base64url").toString()
    );

    expect(payload.expiresAt).toBeDefined();
    const expiresMs = new Date(payload.expiresAt).getTime();
    expect(expiresMs).toBeGreaterThan(before);
  });
});
