import { PluginConfiguration } from "@server/models";
import env from "./env";

export interface ConfluenceConfig {
  CONFLUENCE_URL?: string;
  CONFLUENCE_CLIENT_ID?: string;
  CONFLUENCE_CLIENT_SECRET?: string;
}

/**
 * Get Confluence configuration for a team.
 * Priority: Database config > Environment variables
 */
export async function getConfluenceConfig(
  teamId: string
): Promise<ConfluenceConfig> {
  const dbConfig = await PluginConfiguration.findByPluginAndTeam(
    "confluence",
    teamId
  );

  return {
    CONFLUENCE_URL:
      dbConfig?.config.CONFLUENCE_URL || env.CONFLUENCE_URL || undefined,
    CONFLUENCE_CLIENT_ID:
      dbConfig?.config.CONFLUENCE_CLIENT_ID ||
      env.CONFLUENCE_CLIENT_ID ||
      undefined,
    CONFLUENCE_CLIENT_SECRET:
      dbConfig?.config.CONFLUENCE_CLIENT_SECRET ||
      env.CONFLUENCE_CLIENT_SECRET ||
      undefined,
  };
}

/**
 * Check if Confluence is configured (either in DB or env)
 */
export async function isConfluenceConfigured(
  teamId: string
): Promise<boolean> {
  const config = await getConfluenceConfig(teamId);
  return !!(
    config.CONFLUENCE_URL &&
    config.CONFLUENCE_CLIENT_ID &&
    config.CONFLUENCE_CLIENT_SECRET
  );
}
