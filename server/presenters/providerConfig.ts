import { signin } from "@shared/utils/routeHelpers";
import { Plugin, Hook } from "@server/utils/PluginManager";

export default function presentProviderConfig(
  config: Plugin<Hook.AuthProvider>
) {
  return {
    id: config.value.id,
    name: config.name,
    authUrl: signin(config.value.id),
  };
}
