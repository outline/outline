import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import env from "./env";
import { SESEmailProvider } from "./SESEmailProvider";

// A region is the only thing SES needs beyond credentials, which are resolved
// from the standard AWS credential chain when the client is created.
const enabled = !!env.AWS_SES_REGION;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.EmailProvider,
      value: new SESEmailProvider(),
    },
  ]);
}
