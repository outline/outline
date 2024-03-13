import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/github";
import env from "./env";
import { githubApp } from "./github";
import IntegrationDeletedProcessor from "./processors/IntegrationDeletedProcessor";

const enabled =
  !!env.GITHUB_CLIENT_ID &&
  !!env.GITHUB_CLIENT_SECRET &&
  !!env.GITHUB_APP_NAME &&
  !!env.GITHUB_APP_ID &&
  !!env.GITHUB_APP_PRIVATE_KEY;

PluginManager.register(PluginType.API, router, { ...config, enabled });

PluginManager.register(PluginType.UnfurlProvider, githubApp.unfurl as any, {
  enabled,
  ...config,
});

PluginManager.registerProcessor(IntegrationDeletedProcessor, { enabled });
