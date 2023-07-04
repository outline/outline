import { IntegrationService, IntegrationType } from "@shared/types";
import { sequelize } from "@server/database/sequelize";
import { Integration, User } from "@server/models";
import { buildAdmin, buildIntegration } from "@server/test/factories";
import integrationUpdater from "./integrationUpdater";

describe("#integrationUpdater", () => {
  let user: User;
  beforeEach(async () => {
    user = await buildAdmin();
  });

  it("should successfully update integration settings", async () => {
    const integration: Integration<IntegrationType.Embed> =
      await buildIntegration({
        userId: user.id,
        teamId: user.teamId,
        type: IntegrationType.Embed,
        settings: { url: "https://foo.bar" },
      });

    await sequelize.transaction(async (transaction) =>
      integrationUpdater({
        integration,
        settings: { url: "https://example.com" },
        transaction,
      })
    );
    expect(integration.settings?.url).toEqual("https://example.com");
  });

  it("should successfully update integration events when integration type is post", async () => {
    const integration: Integration<IntegrationType.Post> =
      await buildIntegration({
        userId: user.id,
        teamId: user.teamId,
        type: IntegrationType.Post,
        events: ["documents.publish"],
      });

    await sequelize.transaction(async (transaction) =>
      integrationUpdater({
        integration,
        events: ["documents.update", "documents.something"],
        transaction,
      })
    );

    expect(integration.events).toContain("documents.update");
    expect(integration.events).not.toContain("documents.publish");
    expect(integration.events).not.toContain("documents.something");
  });

  it("should successfully update integration events when integration type is not post", async () => {
    const integration: Integration<IntegrationType.Post> =
      await buildIntegration({
        userId: user.id,
        teamId: user.teamId,
        type: IntegrationType.Embed,
        service: IntegrationService.Iframely,
        events: [],
      });

    await sequelize.transaction(async (transaction) =>
      integrationUpdater({
        integration,
        events: ["documents.update", "documents.publish"],
        transaction,
      })
    );

    expect(integration.events).toContain("documents.update");
    expect(integration.events).toContain("documents.publish");
  });

  it("should successfully update the previously existing integration token", async () => {
    const integration: Integration<IntegrationType.Post> =
      await buildIntegration({
        userId: user.id,
        teamId: user.teamId,
        service: IntegrationService.Iframely,
        type: IntegrationType.Embed,
        authentication: {
          token: "token",
        },
      });

    await sequelize.transaction(async (transaction) =>
      integrationUpdater({
        integration,
        token: "new-token",
        transaction,
      })
    );

    const intg = await Integration.scope("withAuthentication").findByPk(
      integration.id
    );
    expect(intg?.authenticationId).not.toBeNull();
    expect(intg?.authentication.token).toEqual("new-token");
  });

  it("should successfully update the previously absent integration token", async () => {
    const integration: Integration<IntegrationType.Post> =
      await buildIntegration({
        userId: user.id,
        teamId: user.teamId,
        service: IntegrationService.Iframely,
        type: IntegrationType.Embed,
      });

    await sequelize.transaction(async (transaction) =>
      integrationUpdater({
        integration,
        token: "token",
        transaction,
      })
    );

    const intg = await Integration.scope("withAuthentication").findByPk(
      integration.id
    );
    expect(intg?.authenticationId).not.toBeNull();
    expect(intg?.authentication.token).toEqual("token");
  });

  it("should successfully update the integration when a null token is passed", async () => {
    const integration: Integration<IntegrationType.Post> =
      await buildIntegration({
        userId: user.id,
        teamId: user.teamId,
        service: IntegrationService.Iframely,
        type: IntegrationType.Embed,
        authentication: {
          token: "token",
        },
      });

    await sequelize.transaction(async (transaction) =>
      integrationUpdater({
        integration,
        token: null,
        transaction,
      })
    );

    const intg = await Integration.scope("withAuthentication").findByPk(
      integration.id
    );
    expect(intg?.authenticationId).toBeNull();
    expect(intg?.authentication).toBeNull();
  });
});
