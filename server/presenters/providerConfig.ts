import { signin } from "@shared/utils/urlHelpers";
import { AuthenticationProviderConfig } from "@server/routes/auth/providers";

export default function presentProviderConfig(
  config: AuthenticationProviderConfig
) {
  return {
    id: config.id,
    name: config.name,
    authUrl: signin(config.id),
  };
}
