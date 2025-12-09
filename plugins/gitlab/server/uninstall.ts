import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration } from "@server/models";

export async function uninstall(
  integration: Integration<IntegrationType.Embed>
) {
  if (integration.service === IntegrationService.GitLab) {
    // GitLab doesn't require cleanup like GitHub app uninstall
    // The integration will simply be removed from the database
  }
}
