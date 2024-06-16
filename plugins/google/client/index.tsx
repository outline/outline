import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import Icon from "./Icon";

export default PluginManager.add([
  {
    ...config,
    type: Hook.Icon,
    value: Icon,
  },
]);
