// @flow
import { AuthenticationProvider } from "../models";

export default function present(
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
