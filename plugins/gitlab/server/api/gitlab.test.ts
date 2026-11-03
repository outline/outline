import { IntegrationService, IntegrationType } from "@shared/types";
import { buildAdmin, buildUser, buildViewer } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#gitlab.callback", () => {
  it("should reject callback when state nonce does not match cookie", async () => {
    const user = await buildUser();
    const state = JSON.stringify({
      teamId: user.teamId,
      nonce: "attacker-nonce",
    });
    const res = await server.get(
      `/api/gitlab.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
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
      `/api/gitlab.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });

  it("should fail when state is not valid JSON", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/api/gitlab.callback?state=bad&code=123`,
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
      `/api/gitlab.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "gitlabOAuthNonce=nonce" },
      }
    );
    expect(res.status).toEqual(403);
  });
});

describe("#integrations.create", () => {
  it("should accept the settings of a gitlab integration", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", admin, {
      body: {
        type: IntegrationType.Embed,
        service: IntegrationService.GitLab,
        settings: { gitlab: { url: "https://gitlab.example.com" } },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.settings).toEqual({
      gitlab: { url: "https://gitlab.example.com" },
    });
  });
});
