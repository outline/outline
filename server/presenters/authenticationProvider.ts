import { omit } from "es-toolkit/compat";
import type { AuthenticationProvider } from "@server/models";
import { PluginManager } from "@server/utils/PluginManager";

/**
 * Presents an AuthenticationProvider model for API responses.
 *
 * @param authenticationProvider - the authentication provider to present.
 * @returns a plain object for serialization.
 */
export default function presentAuthenticationProvider(
  authenticationProvider: AuthenticationProvider
) {
  const groupSyncProvider = PluginManager.getGroupSyncProvider(
    authenticationProvider.name
  );
  const { config } = authenticationProvider;

  return {
    id: authenticationProvider.id,
    name: authenticationProvider.name,
    displayName: authenticationProvider.displayName,
    providerId: authenticationProvider.providerId,
    createdAt: authenticationProvider.createdAt,
    isEnabled: authenticationProvider.enabled,
    isConnected: true,
    settings: authenticationProvider.settings ?? undefined,
    config: config ? omit(config, "clientSecret") : undefined,
    groupSyncSupported: !!groupSyncProvider,
    groupSyncUsesClaim: groupSyncProvider?.useGroupClaim ?? false,
    groupSyncRequiresSetup: !!groupSyncProvider?.startGroupSync,
  };
}
