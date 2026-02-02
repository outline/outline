import type PluginConfiguration from "@server/models/PluginConfiguration";

export default function presentPluginConfiguration(
  pluginConfig: PluginConfiguration
) {
  return {
    id: pluginConfig.id,
    pluginId: pluginConfig.pluginId,
    config: pluginConfig.config,
    teamId: pluginConfig.teamId,
    createdAt: pluginConfig.createdAt,
    updatedAt: pluginConfig.updatedAt,
  };
}
