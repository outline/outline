import { signin } from "@shared/utils/routeHelpers";
import { AuthenticationProviderConfig } from "@server/models/helpers/AuthenticationHelper";

export default function presentProviderConfig(
  config: AuthenticationProviderConfig
) {
  return {
    id: config.id,
    name: config.name,
    authUrl: signin(config.id),
  };
}
