import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration } from "@server/models";
import { GitHub } from "./github";

export async function uninstall(
  integration: Integration<IntegrationType.Embed>
) {
  if (integration.service === IntegrationService.GitHub) {
    const installationId = integration.settings?.github?.installation.id;

    if (installationId) {
      const client = await GitHub.authenticateAsInstallation(installationId);
      await client.requestAppUninstall(installationId);
    }
  }
}
