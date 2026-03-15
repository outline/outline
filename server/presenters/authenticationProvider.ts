import type { AuthenticationProvider } from "@server/models";

/**
 * Presents an AuthenticationProvider model for API responses.
 *
 * @param authenticationProvider - the authentication provider to present.
 * @returns a plain object for serialization.
 */
export default function presentAuthenticationProvider(
  authenticationProvider: AuthenticationProvider
) {
  return {
    id: authenticationProvider.id,
    name: authenticationProvider.name,
    providerId: authenticationProvider.providerId,
    createdAt: authenticationProvider.createdAt,
    isEnabled: authenticationProvider.enabled,
    isConnected: true,
    settings: authenticationProvider.settings ?? undefined,
  };
}
