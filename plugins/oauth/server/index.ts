import { PluginManager, Hook } from "@server/utils/PluginManager";
import OAuthAuthentication from "./models/OAuthAuthentication";
import OAuthAuthorizationCode from "./models/OAuthAuthorizationCode";
import OAuthClient from "./models/OAuthClient";
import oauth from "./oauth";

PluginManager.add([
  {
    type: Hook.Model,
    value: OAuthClient,
  },
  {
    type: Hook.Model,
    value: OAuthAuthentication,
  },
  {
    type: Hook.Model,
    value: OAuthAuthorizationCode,
  },
  {
    type: Hook.Route,
    value: {
      path: "/oauth",
      app: oauth,
    },
  },
]);
