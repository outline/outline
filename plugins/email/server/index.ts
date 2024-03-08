import env from "@server/env";
import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/email";

PluginManager.register(PluginType.AuthProvider, router, {
  ...config,
  enabled: (!!env.SMTP_HOST && !!env.SMTP_USERNAME) || env.isDevelopment,
});
