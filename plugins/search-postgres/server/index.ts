import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import PostgresSearchProvider from "./PostgresSearchProvider";

const provider = new PostgresSearchProvider();

PluginManager.add([
  {
    ...config,
    type: Hook.SearchProvider,
    value: provider,
  },
]);
