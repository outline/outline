/* eslint-disable @typescript-eslint/no-var-requires */
import path from "path";
import { glob } from "glob";
import Router from "koa-router";
import { sortBy } from "lodash";
import { requireDirectory } from "@server/utils/fs";

export type AuthenticationProviderConfig = {
  id: string;
  name: string;
  enabled: boolean;
  router: Router;
};

const authenticationProviderConfigs: AuthenticationProviderConfig[] = [];

requireDirectory<{
  default: Router;
  config: { name: string; enabled: boolean };
}>(__dirname).forEach(([module, id]) => {
  const { config, default: router } = module;

  if (id === "index") {
    return;
  }

  if (!config) {
    throw new Error(
      `Auth providers must export a 'config' object, missing in ${id}`
    );
  }

  if (!router || !router.routes) {
    throw new Error(
      `Default export of an auth provider must be a koa-router, missing in ${id}`
    );
  }

  if (config && config.enabled) {
    authenticationProviderConfigs.push({
      id,
      name: config.name,
      enabled: config.enabled,
      router,
    });
  }
});

// Temporarily also include plugins here until all auth methods are moved over.
glob
  .sync("build/plugins/*/server/auth/!(*.test).js")
  .forEach((filePath: string) => {
    const authProvider = require(path.join(process.cwd(), filePath)).default;
    const id = filePath.split("/")[2];
    const config = require(path.join(
      process.cwd(),
      "build",
      "plugins",
      id,
      "plugin.json"
    ));

    authenticationProviderConfigs.push({
      id,
      name: config.name,
      enabled: true,
      router: authProvider,
    });
  });

export default sortBy(authenticationProviderConfigs, "id");
