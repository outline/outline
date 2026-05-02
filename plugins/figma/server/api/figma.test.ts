import { buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#figma.callback", () => {
  it("should reject callback when state nonce does not match cookie", async () => {
    const user = await buildUser();
    const state = JSON.stringify({
      teamId: user.teamId,
      nonce: "attacker-nonce",
    });
    const res = await server.get(
      `/api/figma.callback?state=${encodeURIComponent(
        state
      )}&code=123&token=${user.getJwtToken()}`,
      { redirect: "manual" }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
  });

  it("should reject callback when nonce is missing from state", async () => {
    const user = await buildUser();
    const state = JSON.stringify({ teamId: user.teamId });
    const res = await server.get(
      `/api/figma.callback?state=${encodeURIComponent(
        state
      )}&code=123&token=${user.getJwtToken()}`,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });

  it("should fail when state is not valid JSON", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/api/figma.callback?state=bad&code=123&token=${user.getJwtToken()}`,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });
});
