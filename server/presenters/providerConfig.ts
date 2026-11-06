import { signin } from "@shared/utils/routeHelpers";
import type { SignInOption } from "@server/models/helpers/AuthenticationHelper";

/**
 * Presents a sign-in option for the login screen.
 *
 * @param config the sign-in option to present.
 * @returns a plain object for serialization.
 */
export default function presentProviderConfig({
  plugin,
  authenticationProvider,
}: SignInOption) {
  if (authenticationProvider) {
    return {
      id: plugin.value.id,
      name: authenticationProvider.displayName,
      authUrl: signin(`${plugin.value.id}/${authenticationProvider.id}`),
    };
  }

  return {
    id: plugin.value.id,
    name: plugin.name,
    authUrl: signin(plugin.value.id),
  };
}
