import { IntegrationService, IntegrationType } from "@shared/types";
import type { User } from "@server/models";
import { Integration } from "@server/models";
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
      `/api/figma.callback?state=${encodeURIComponent(state)}&code=123`,
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
      `/api/figma.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });

  it("should fail when state is not valid JSON", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/api/figma.callback?state=bad&code=123`,
      user,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });
});

describe("#integrations.info", () => {
  const buildFigmaAccount = (owner: User) =>
    Integration.create<Integration<IntegrationType.LinkedAccount>>({
      userId: owner.id,
      teamId: owner.teamId,
      service: IntegrationService.Figma,
      type: IntegrationType.LinkedAccount,
      settings: {
        figma: {
          account: {
            id: "123",
            name: "owner",
            email: "owner@example.com",
            avatarUrl: "https://example.com/avatar.png",
          },
        },
      },
    });

  it("should expose figma account settings to the owner", async () => {
    const owner = await buildUser();
    const integration = await buildFigmaAccount(owner);

    const res = await server.post("/api/integrations.info", owner, {
      body: { id: integration.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.settings.figma.account.email).toEqual("owner@example.com");
  });
});
