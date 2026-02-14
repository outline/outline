import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import PostgresSearchProvider from "./PostgresSearchProvider";
import SearchIndexProcessor from "./processors/SearchIndexProcessor";

const provider = new PostgresSearchProvider();

PluginManager.add([
  {
    ...config,
    type: Hook.SearchProvider,
    value: provider,
  },
  {
    type: Hook.Processor,
    value: SearchIndexProcessor,
  },
]);
