import { AuthenticationProvider } from "../models";

export default function present(
  // @ts-expect-error ts-migrate(2749) FIXME: 'AuthenticationProvider' refers to a value, but is... Remove this comment to see the full error message
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
