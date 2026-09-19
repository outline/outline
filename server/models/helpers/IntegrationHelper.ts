import { uniq } from "es-toolkit/compat";
import { IntegrationService, type IntegrationType } from "@shared/types";
import env from "@server/env";
import type Integration from "@server/models/Integration";

/**
 * Helper class for working with integrations.
 */
export default class IntegrationHelper {
  /**
   * Returns the script sources that must be allowed by the Content Security
   * Policy for the given analytics integrations to load.
   *
   * @param integrations The analytics integrations.
   * @returns A list of CSP script sources.
   */
  public static getAnalyticsScriptSrc(
    integrations: Integration<IntegrationType.Analytics>[] = []
  ): string[] {
    // The cloud policy already allows the third-party services that are
    // available to hosted teams.
    if (env.isCloudHosted) {
      return [];
    }

    return uniq(
      integrations.flatMap((integration) =>
        IntegrationHelper.scriptSrcForIntegration(integration)
      )
    );
  }

  private static scriptSrcForIntegration(
    integration: Integration<IntegrationType.Analytics>
  ): string[] {
    if (integration.service === IntegrationService.GoogleAnalytics) {
      return ["www.googletagmanager.com", "www.google-analytics.com"];
    }

    // Self-hosted analytics services are loaded from the configured instance.
    if (integration.settings?.instanceUrl) {
      try {
        return [new URL(integration.settings.instanceUrl).host];
      } catch {
        return [];
      }
    }

    return [];
  }
}
