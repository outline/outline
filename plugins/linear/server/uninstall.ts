import type { IntegrationType } from "@shared/types";
import { IntegrationService } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { Integration } from "@server/models";
import { Linear } from "./linear";

export async function uninstall(
  integration: Integration<IntegrationType.Embed>
) {
  if (integration.service !== IntegrationService.Linear) {
    return;
  }

  const authentication = await integration.$get("authentication");

  if (!authentication) {
    return;
  }

  try {
    await Linear.revokeAccess(authentication.token);
  } catch (err) {
    // suppress error since this is a best-effort operation.
    Logger.error("Failed to revoke Linear access token", err);
  }
}
