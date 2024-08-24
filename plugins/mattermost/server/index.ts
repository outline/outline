import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import api from "./api/mattermost";
import { MattermostProcessor } from "./processors/MattermostProcessor";

PluginManager.add([
  {
    ...config,
    type: Hook.API,
    value: api,
  },
  {
    type: Hook.Processor,
    value: MattermostProcessor,
  },
]);
