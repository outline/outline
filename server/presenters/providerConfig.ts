import { signin } from "@shared/utils/routeHelpers";
import { Plugin, PluginType } from "@server/utils/PluginManager";

export default function presentProviderConfig(
  config: Plugin<PluginType.AuthProvider>
) {
  return {
    id: config.id,
    name: config.name,
    authUrl: signin(config.id),
  };
}
