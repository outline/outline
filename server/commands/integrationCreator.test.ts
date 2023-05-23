import { IntegrationType } from "@shared/types";
import { sequelize } from "@server/database/sequelize";
import { User } from "@server/models";
import Integration, {
  UserCreatableIntegrationService,
} from "@server/models/Integration";
import { buildAdmin } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import integrationCreator from "./integrationCreator";

setupTestDatabase();

describe("#integrationCreator", () => {
  let integration: Integration<unknown>;
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
});
