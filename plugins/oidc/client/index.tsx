import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import Icon from "./Icon";

PluginManager.add([
  {
    ...config,
    type: Hook.Icon,
    value: Icon,
  },
  {
    ...config,
    id: "oidc-custom",
    type: Hook.Icon,
    value: Icon,
  },
]);
