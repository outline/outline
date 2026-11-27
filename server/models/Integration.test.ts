import { IntegrationService, IntegrationType } from "@shared/types";
import { sequelize } from "@server/storage/database";
import { buildIntegration, buildTeam } from "@server/test/factories";
import Integration from "./Integration";

describe("Integration", () => {
  describe("findEnabledByTeamIdAndService", () => {
    it("returns only integrations for the team and service", async () => {
      const integration = await buildIntegration({
        service: IntegrationService.GitHub,
        type: IntegrationType.Post,
      });
      await buildIntegration({ teamId: integration.teamId });
      await buildIntegration({ service: IntegrationService.GitHub });

      const result = await Integration.findEnabledByTeamIdAndService(
        integration.teamId,
        IntegrationService.GitHub
      );

      expect(result).toEqual([
        {
          id: integration.id,
          type: IntegrationType.Post,
          collectionId: null,
          events: integration.events,
        },
      ]);
    });

    it("returns an empty array when the team has no integrations", async () => {
      const team = await buildTeam();

      const result = await Integration.findEnabledByTeamIdAndService(
        team.id,
        IntegrationService.GitHub
      );

      expect(result).toEqual([]);
    });

    it("reflects an integration created after the cache is primed", async () => {
      const team = await buildTeam();
      const before = await Integration.findEnabledByTeamIdAndService(
        team.id,
        IntegrationService.GitHub
      );
      expect(before).toHaveLength(0);

      await sequelize.transaction(async (transaction) => {
        await Integration.create(
          { teamId: team.id, service: IntegrationService.GitHub },
          { transaction }
        );
      });

      const after = await Integration.findEnabledByTeamIdAndService(
        team.id,
        IntegrationService.GitHub
      );
      expect(after).toHaveLength(1);
    });

    it("reflects changes after an integration is destroyed and restored", async () => {
      const integration = await buildIntegration({
        service: IntegrationService.GitHub,
      });
      const find = () =>
        Integration.findEnabledByTeamIdAndService(
          integration.teamId,
          IntegrationService.GitHub
        );

      expect(await find()).toHaveLength(1);

      await integration.destroy();
      expect(await find()).toHaveLength(0);

      await integration.restore();
      expect(await find()).toHaveLength(1);
    });
  });
});
