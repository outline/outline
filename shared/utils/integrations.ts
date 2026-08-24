import type { IntegrationSettings, IntegrationType } from "../types";

/**
 * Returns the url of the custom installation configured for an embed
 * integration. Settings are stored nested under the service name, or flat for
 * services that predate nesting.
 *
 * @param settings the embed integration settings.
 * @returns the installation url, or undefined when none is configured.
 */
export function getInstallationUrl(
  settings: IntegrationSettings<IntegrationType.Embed> | undefined
): string | undefined {
  return settings?.diagrams?.url ?? settings?.url;
}
