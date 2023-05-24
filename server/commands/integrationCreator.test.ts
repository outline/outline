import { IntegrationService, IntegrationType } from "@shared/types";
import { sequelize } from "@server/database/sequelize";
import { User } from "@server/models";
import Integration, {
  UserCreatableIntegrationService,
} from "@server/models/Integration";
import { buildAdmin, buildCollection } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import integrationCreator from "./integrationCreator";

setupTestDatabase();

describe("#integrationCreator", () => {
  let integration: Integration;
  let user: User;

  beforeEach(async () => {
    user = await buildAdmin();
    const intg = await Integration.findOne();
    expect(intg).toBeNull();
  });

  it("should create and return integration", async () => {
    integration = await sequelize.transaction(async (transaction) =>
      integrationCreator({
        user,
        type: IntegrationType.Embed,
        service: UserCreatableIntegrationService.Diagrams,
        settings: { url: "https://example.com" },
        transaction,
      })
    );

    const intg = await Integration.findOne();
    expect(intg).not.toBeNull();
    expect(intg?.id).toEqual(integration.id);
  });

  it("should create an integration with its auth and return the integration", async () => {
    integration = await sequelize.transaction(async (transaction) =>
      integrationCreator({
        user,
        type: IntegrationType.Embed,
        service: UserCreatableIntegrationService.Diagrams,
        settings: { url: "https://example.com" },
        token: "token",
        transaction,
      })
    );

    const intg = await Integration.scope("withAuthentication").findOne();
    expect(intg).not.toBeNull();
    expect(intg?.id).toEqual(integration.id);
    expect(intg?.authenticationId).not.toBeNull();
    expect(intg?.authentication.token).toEqual("token");
  });

  it("should successfully create slack command integration", async () => {
    integration = await sequelize.transaction(async (transaction) =>
      integrationCreator({
        user,
        type: IntegrationType.Command,
        service: IntegrationService.Slack,
        token: "token",
        authScopes: ["scope1", "scope2"],
        settings: { serviceTeamId: "someid" },
        transaction,
      })
    );

    const intg = await Integration.scope("withAuthentication").findOne();
    expect(intg).not.toBeNull();
    expect(intg?.id).toEqual(integration.id);
    expect(intg?.authenticationId).not.toBeNull();
    expect(intg?.authentication.token).toEqual("token");
    expect(intg?.authentication.scopes).toContain("scope1");
    expect(intg?.authentication.scopes).toContain("scope2");
  });

  it("should successfully create slack post integration", async () => {
    const collection = await buildCollection({
      teamId: user.teamId,
      createdById: user.id,
    });
    integration = await sequelize.transaction(async (transaction) =>
      integrationCreator({
        user,
        type: IntegrationType.Post,
        service: IntegrationService.Slack,
        token: "token",
        events: ["documents.update", "documents.publish"],
        collectionId: collection.id,
        authScopes: ["scope1", "scope2"],
        settings: {
          url: "https://foo.bar",
          channel: "channel",
          channelId: "channelId",
        },
        transaction,
      })
    );

    const intg = (await Integration.scope(
      "withAuthentication"
    ).findOne()) as Integration<IntegrationType.Post>;
    expect(intg).not.toBeNull();
    expect(intg?.id).toEqual(integration.id);
    expect(intg?.type).toEqual(IntegrationType.Post);
    expect(intg?.service).toEqual(IntegrationService.Slack);
    expect(intg?.collectionId).toEqual(integration.collectionId);
    expect(intg?.events).toContain("documents.update");
    expect(intg?.events).toContain("documents.publish");
    expect(intg?.settings).not.toBeNull();
    expect(intg?.settings?.url).toEqual("https://foo.bar");
    expect(intg?.settings.channel).toEqual("channel");
    expect(intg?.settings.channelId).toEqual("channelId");
    expect(intg?.authenticationId).not.toBeNull();
    expect(intg?.authentication.token).toEqual("token");
    expect(intg?.authentication.scopes).toContain("scope1");
    expect(intg?.authentication.scopes).toContain("scope2");
  });
});
