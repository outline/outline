import { IntegrationService } from "@shared/types";
import { Integration } from "@server/models";
import { buildAdmin, buildUser, buildViewer } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { GitHub, InstallationAccess } from "../github";
import { SetupAction } from "./schema";

const server = getTestServer();

describe("#github.callback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject an installation the user cannot manage", async () => {
    const user = await buildAdmin();
    const state = JSON.stringify({ teamId: user.teamId, nonce: "nonce" });
    const client = {
      requestAppInstallations: async () => [
        { id: 1, permissions: { issues: "read" }, account: null },
      ],
    } as unknown as Awaited<ReturnType<typeof GitHub.authenticateAsUser>>;
    vi.spyOn(GitHub, "authenticateAsUser").mockResolvedValue(client);
    const spy = vi
      .spyOn(GitHub, "canManageInstallation")
      .mockResolvedValue(InstallationAccess.Denied);

    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(
        state
      )}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "githubOAuthNonce=nonce" },
      }
    );

    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).toContain("error=denied");
    expect(spy).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ id: 1 })
    );
    expect(
      await Integration.count({
        where: { teamId: user.teamId, service: IntegrationService.GitHub },
      })
    ).toEqual(0);
  });

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

  it.each([
    ["member", buildUser],
    ["viewer", buildViewer],
  ])("should not allow a %s to create an integration", async (_, build) => {
    const user = await build();
    const state = JSON.stringify({ teamId: user.teamId, nonce: "nonce" });
    const res = await server.get(
      `/api/github.callback?state=${encodeURIComponent(state)}&code=123&setup_action=${SetupAction.install}&installation_id=1`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "githubOAuthNonce=nonce" },
      }
    );
    expect(res.status).toEqual(403);
  });
});
