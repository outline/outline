import type { AuthenticationProvider } from "@server/models";

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
  };
}
