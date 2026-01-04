import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/passkeys";
import api from "./api/passkeys";

PluginManager.add([
  {
    ...config,
    type: Hook.AuthProvider,
    value: { router, id: config.id },
  },
  {
    ...config,
    type: Hook.API,
    value: api,
  },
]);
