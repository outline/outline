import { IntegrationService, IntegrationType } from "@shared/types";
import type { User } from "@server/models";
import { Integration, IntegrationAuthentication } from "@server/models";
import { buildAdmin, buildUser, buildViewer } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { Gitea } from "../gitea";

const server = getTestServer();
const giteaUrl = "https://93.184.215.14";

async function buildConnectedIntegration() {
  const user = await buildAdmin();
  const authentication = await IntegrationAuthentication.create({
    service: IntegrationService.Gitea,
    userId: user.id,
    teamId: user.teamId,
    clientId: "id",
    clientSecret: "secret",
    token: "old-token",
    refreshToken: "old-refresh",
  });
  const integration = await Integration.create({
    service: IntegrationService.Gitea,
    type: IntegrationType.Embed,
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
    settings: {
      gitea: {
        url: giteaUrl,
        installation: {
          id: 42,
          account: { id: 42, name: "octo", avatarUrl: "" },
        },
      },
    },
  });
  return { user, integration };
}

async function connect(user: User, clientId = "id") {
  const res = await server.post("/api/gitea.connect", user, {
    body: { url: giteaUrl, clientId, clientSecret: "secret" },
  });
  const { data } = await res.json();
  return new URL(data.redirectUrl).searchParams.get("state") ?? "";
}

function callback(user: User, state: string) {
  const { nonce } = JSON.parse(state);
  return server.get(
    `/api/gitea.callback?state=${encodeURIComponent(state)}&code=123`,
    user,
    {
      redirect: "manual",
      headers: { Cookie: `giteaOAuthNonce=${nonce}` },
    }
  );
}

describe("#gitea.connect", () => {
  it("should require all of url, clientId and clientSecret", async () => {
    const user = await buildAdmin();
    const res = await server.post("/api/gitea.connect", user, {
      body: { url: giteaUrl },
    });
    expect(res.status).toEqual(400);
  });

  it("should require an https url", async () => {
    const user = await buildAdmin();
    const res = await server.post("/api/gitea.connect", user, {
      body: { url: "http://93.184.215.14", clientId: "id", clientSecret: "s" },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow a member to connect", async () => {
    const user = await buildUser();
    const res = await server.post("/api/gitea.connect", user, {
      body: { url: giteaUrl, clientId: "id", clientSecret: "secret" },
    });
    expect(res.status).toEqual(403);
  });

  it("should create a pending integration and return the redirect url", async () => {
    const user = await buildAdmin();
    const res = await server.post("/api/gitea.connect", user, {
      body: { url: `${giteaUrl}/`, clientId: "id", clientSecret: "secret" },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);

    const redirectUrl = new URL(body.data.redirectUrl);
    expect(redirectUrl.origin).toEqual(giteaUrl);
    expect(redirectUrl.pathname).toEqual("/login/oauth/authorize");
    expect(redirectUrl.searchParams.get("client_id")).toEqual("id");

    const integration = await Integration.findOne({
      where: { service: IntegrationService.Gitea, teamId: user.teamId },
      include: [{ model: IntegrationAuthentication, as: "authentication" }],
    });
    expect(integration?.settings).toEqual({ gitea: { url: giteaUrl } });
    expect(integration?.authentication.clientId).toEqual("id");
    expect(integration?.authentication.token).toBeFalsy();
  });
});

describe("#gitea.connect reconnect", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should remove an earlier connection attempt by the same user", async () => {
    const user = await buildAdmin();
    const body = { url: giteaUrl, clientId: "id", clientSecret: "secret" };

    await server.post("/api/gitea.connect", user, { body });
    await server.post("/api/gitea.connect", user, {
      body: { ...body, clientId: "id2" },
    });

    const integrations = await Integration.findAll({
      where: { service: IntegrationService.Gitea, teamId: user.teamId },
      include: [{ model: IntegrationAuthentication, as: "authentication" }],
    });
    expect(integrations.length).toEqual(1);
    expect(integrations[0].authentication.clientId).toEqual("id2");
    expect(
      await IntegrationAuthentication.count({
        where: { service: IntegrationService.Gitea, teamId: user.teamId },
      })
    ).toEqual(1);
  });

  it("should keep the connected integration working until the callback succeeds", async () => {
    const { user, integration } = await buildConnectedIntegration();

    const res = await server.post("/api/gitea.connect", user, {
      body: { url: giteaUrl, clientId: "id2", clientSecret: "secret2" },
    });
    expect(res.status).toEqual(200);

    const authentication = await IntegrationAuthentication.findByPk(
      integration.authenticationId
    );
    expect(authentication?.token).toEqual("old-token");
    expect(authentication?.clientId).toEqual("id");
  });

  it("should move the new authentication to the connected integration", async () => {
    const { user, integration } = await buildConnectedIntegration();
    const state = await connect(user, "id2");
    vi.spyOn(Gitea, "oauthAccess").mockResolvedValue({
      access_token: "new-token",
      refresh_token: "new-refresh",
      token_type: "bearer",
      expires_in: 3600,
    });
    vi.spyOn(Gitea, "getCurrentUser").mockResolvedValue({
      id: 43,
      login: "other",
      avatar_url: "https://93.184.215.14/other.png",
    });

    const res = await callback(user, state);
    expect(res.headers.get("location")).not.toContain("error=");

    const integrations = await Integration.findAll({
      where: { service: IntegrationService.Gitea, teamId: user.teamId },
      include: [{ model: IntegrationAuthentication, as: "authentication" }],
      paranoid: false,
    });
    expect(integrations.length).toEqual(1);
    expect(integrations[0].id).toEqual(integration.id);
    expect(integrations[0].authentication.token).toEqual("new-token");
    expect(integrations[0].authentication.clientId).toEqual("id2");
    expect(integrations[0].settings).toMatchObject({
      gitea: { url: giteaUrl, installation: { id: 43 } },
    });
    expect(
      await IntegrationAuthentication.findByPk(integration.authenticationId)
    ).toBeNull();
  });
});

describe("#gitea.callback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject callback when state nonce does not match cookie", async () => {
    const user = await buildAdmin();
    const state = JSON.stringify({
      teamId: user.teamId,
      nonce: "attacker-nonce",
    });
    const res = await server.get(
      `/api/gitea.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      { redirect: "manual" }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
  });

  it("should fail when state is not valid JSON", async () => {
    const user = await buildAdmin();
    const res = await server.get(
      `/api/gitea.callback?state=bad&code=123`,
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
      `/api/gitea.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "giteaOAuthNonce=nonce" },
      }
    );
    expect(res.status).toEqual(403);
  });

  it("should redirect with an error when there is no pending connection", async () => {
    const user = await buildAdmin();
    const state = JSON.stringify({ teamId: user.teamId, nonce: "nonce" });
    const res = await server.get(
      `/api/gitea.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "giteaOAuthNonce=nonce" },
      }
    );
    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).toContain("error=unauthenticated");
  });

  it("should complete the pending connection", async () => {
    const user = await buildAdmin();
    const connectRes = await server.post("/api/gitea.connect", user, {
      body: { url: giteaUrl, clientId: "id", clientSecret: "secret" },
    });
    const { data } = await connectRes.json();
    const state = new URL(data.redirectUrl).searchParams.get("state") ?? "";
    const { nonce } = JSON.parse(state);

    const oauthAccess = vi.spyOn(Gitea, "oauthAccess").mockResolvedValue({
      access_token: "access",
      refresh_token: "refresh",
      token_type: "bearer",
      expires_in: 3600,
    });
    vi.spyOn(Gitea, "getCurrentUser").mockResolvedValue({
      id: 42,
      login: "octo",
      avatar_url: "https://93.184.215.14/avatar.png",
    });

    const res = await server.get(
      `/api/gitea.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: `giteaOAuthNonce=${nonce}` },
      }
    );
    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).not.toContain("error=");
    expect(oauthAccess).toHaveBeenCalledWith({
      code: "123",
      baseUrl: giteaUrl,
      clientId: "id",
      clientSecret: "secret",
    });

    const integration = await Integration.findOne({
      where: { service: IntegrationService.Gitea, teamId: user.teamId },
      include: [{ model: IntegrationAuthentication, as: "authentication" }],
    });
    expect(integration?.settings).toEqual({
      gitea: {
        url: giteaUrl,
        installation: {
          id: 42,
          account: {
            id: 42,
            name: "octo",
            avatarUrl: "https://93.184.215.14/avatar.png",
          },
        },
      },
    });
    expect(integration?.authentication.token).toEqual("access");
    expect(integration?.authentication.refreshToken).toEqual("refresh");
  });
});
