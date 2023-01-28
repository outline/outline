import { signin } from "@shared/utils/urlHelpers";
import { AuthenticationProviderConfig } from "@server/routes/auth/providers";

export default function presentProvider(
  provider: AuthenticationProviderConfig
) {
  return {
    id: provider.id,
    name: provider.name,
    authUrl: signin(provider.id),
  };
}
