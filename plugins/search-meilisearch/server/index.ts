import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import MeilisearchProvider from "./MeilisearchProvider";

const provider = new MeilisearchProvider();

PluginManager.add([
  {
    ...config,
    type: Hook.SearchProvider,
    value: provider,
  },
]);
