import env from "@server/env";
import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/email";

const enabled = (!!env.SMTP_HOST && !!env.SMTP_USERNAME) || env.isDevelopment;

if (enabled) {
  PluginManager.add({
    ...config,
    type: PluginType.AuthProvider,
    value: { router, id: config.id },
  });
}
