import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/azure";
import { validateAzureADToken } from "./auth/azureAdAuth";
import env from "./env";

const enabled = !!env.AZURE_CLIENT_ID && !!env.AZURE_CLIENT_SECRET;

if (enabled) {
  PluginManager.add({
    ...config,
    type: Hook.AuthProvider,
    value: { router, id: config.id },
  });
}

// Register bearer token validator when Azure AD tenant is configured.
// This enables SSO-based API access for MCP servers and AI agents.
if (env.AZURE_CLIENT_ID && env.AZURE_TENANT_ID) {
  PluginManager.add({
    ...config,
    name: `${config.name}-token-validator`,
    type: Hook.TokenValidator,
    value: validateAzureADToken,
  });
}
