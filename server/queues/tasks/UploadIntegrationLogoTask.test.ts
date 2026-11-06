import { IntegrationService, IntegrationType } from "@shared/types";
import { buildIntegration, buildUser } from "@server/test/factories";
import UploadIntegrationLogoTask from "./UploadIntegrationLogoTask";

describe("UploadIntegrationLogoTask", () => {
  it("should not change settings for jobs without a settings path", async () => {
    const user = await buildUser();
    const settings = { url: "https://example.com" };
    const integration = await buildIntegration({
      userId: user.id,
      teamId: user.teamId,
      service: IntegrationService.Linear,
      type: IntegrationType.Embed,
      settings,
    });

    await new UploadIntegrationLogoTask().perform({
      integrationId: integration.id,
      logoUrl: "https://example.com/logo.png",
    });

    await integration.reload();
    expect(integration.settings).toEqual(settings);
  });
});
