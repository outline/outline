import { AuthenticationProvider } from "@server/models";

export default function presentAuthenticationProvider(
  authenticationProvider: AuthenticationProvider
) {
  return {
    id: authenticationProvider.id,
    name: authenticationProvider.name,
    createdAt: authenticationProvider.createdAt,
    isEnabled: authenticationProvider.enabled,
    isConnected: true,
  };
}
