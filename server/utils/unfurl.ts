import path from "path";
import glob from "glob";
import { startCase } from "lodash";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { UnfurlResolver } from "@server/types";

const resolvers: Record<string, UnfurlResolver> = {};
const rootDir = env.ENVIRONMENT === "test" ? "" : "build";

glob
  .sync(path.join(rootDir, "plugins/*/server/unfurl.js"))
  .forEach((filePath: string) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolver: UnfurlResolver = require(path.join(
      process.cwd(),
      filePath
    ));
    const name = startCase(filePath.split("/")[2]);
    resolvers[name] = resolver;
    Logger.debug("utils", `Registered unfurl resolver ${filePath}`);
  });

export const Iframely = resolvers["Iframely"];
