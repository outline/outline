import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/google";
import env from "./env";
import { GmailEmailProvider } from "./GmailEmailProvider";

const enabled = !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.AuthProvider,
      value: { router, id: config.id },
    },
  ]);
}

const emailEnabled =
  !!env.GOOGLE_MAIL_CLIENT_EMAIL && !!env.GOOGLE_MAIL_PRIVATE_KEY;

if (emailEnabled) {
  PluginManager.add([
    {
      name: config.name,
      description: "Adds Gmail as an email provider.",
      type: Hook.EmailProvider,
      value: new GmailEmailProvider(),
    },
  ]);
}
