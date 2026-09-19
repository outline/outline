import { buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { SetupAction } from "./schema";

const server = getTestServer();

describe("#github.callback", () => {
  it("should reject callback when state cookie is missing", async () => {
    const user = await buildUser();
    const state = JSON.stringify({
      teamId: user.teamId,
      nonce: "state-nonce",
    });
    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(
        state
      )}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      { redirect: "manual" }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
    expect(body.message).toEqual("OAuth state cookie was missing");
  });

  it("should reject callback when state nonce does not match cookie", async () => {
    const user = await buildUser();
    const state = JSON.stringify({
      teamId: user.teamId,
      nonce: "attacker-nonce",
    });
    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(
        state
      )}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "githubOAuthNonce=cookie-nonce" },
      }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
    expect(body.message).toEqual("State returned in OAuth flow did not match");
  });

  it("should reject callback when nonce is missing from state", async () => {
    const user = await buildUser();
    const state = JSON.stringify({ teamId: user.teamId });
    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(
        state
      )}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "githubOAuthNonce=cookie-nonce" },
      }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
    expect(body.message).toEqual("State returned in OAuth flow was missing");
  });

  it("should fail when state is not valid JSON", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/api/github.callback?state=bad&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });
});
