/* eslint-disable @typescript-eslint/no-var-requires */
import path from "path";
import glob from "glob";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { UnfurlResolver } from "@server/types";

const rootDir = env.ENVIRONMENT === "test" ? "" : "build";

const plugins = glob.sync(path.join(rootDir, "plugins/*/server/unfurl.[jt]s"));
const resolvers: Record<string, UnfurlResolver> = plugins.reduce(
  (resolvers, filePath) => {
    const resolver: UnfurlResolver = require(path.join(
      process.cwd(),
      filePath
    ));
    const id = filePath.replace("build/", "").split("/")[1];
    const config = require(path.join(
      process.cwd(),
      rootDir,
      "plugins",
      id,
      "plugin.json"
    ));

    // Test the all required env vars are set for the resolver
    const enabled = (config.requiredEnvVars ?? []).every(
      (name: string) => !!env[name]
    );
    if (!enabled) {
      return resolvers;
    }

    resolvers[config.name] = resolver;
    Logger.debug("utils", `Registered unfurl resolver ${filePath}`);

    return resolvers;
  },
  {}
);

export default resolvers;
