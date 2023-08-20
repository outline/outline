import { existsSync } from "fs";
import path from "path";
import glob from "glob";
import startCase from "lodash/startCase";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { UnfurlResolver } from "@server/types";

const rootDir = env.ENVIRONMENT === "test" ? "" : "build";

const hasResolver = (plugin: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(path.join(process.cwd(), plugin, "plugin.json"));

  return (
    existsSync(resolverPath(plugin)) &&
    (config.requiredEnvVars ?? []).every((name: string) => !!env[name])
  );
};

const resolverPath = (plugin: string) =>
  path.join(plugin, "server", "unfurl.js");

const plugins = glob.sync(path.join(rootDir, "plugins/*"));
const resolvers: Record<string, UnfurlResolver> = plugins
  .filter(hasResolver)
  .map(resolverPath)
  .reduce((resolvers, resolverPath) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolver: UnfurlResolver = require(path.join(
      process.cwd(),
      resolverPath
    ));
    const name = startCase(resolverPath.split("/")[2]);
    resolvers[name] = resolver;
    Logger.debug("utils", `Registered unfurl resolver ${resolverPath}`);

    return resolvers;
  }, {});

export default resolvers;
