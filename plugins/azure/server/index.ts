import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/azure";
import env from "./env";
import { MicrosoftGraphEmailProvider } from "./MicrosoftGraphEmailProvider";

const enabled = !!env.AZURE_CLIENT_ID && !!env.AZURE_CLIENT_SECRET;

if (enabled) {
  PluginManager.add({
    ...config,
    type: Hook.AuthProvider,
    value: { router, id: config.id },
  });
}

const emailEnabled =
  !!env.AZURE_MAIL_CLIENT_ID &&
  !!env.AZURE_MAIL_CLIENT_SECRET &&
  !!env.AZURE_MAIL_TENANT_ID;

if (emailEnabled) {
  PluginManager.add({
    name: config.name,
    description: "Adds Microsoft Graph as an email provider.",
    type: Hook.EmailProvider,
    value: new MicrosoftGraphEmailProvider(),
  });
}
