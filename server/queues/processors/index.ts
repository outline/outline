import path from "path";
import { glob } from "glob";
import Logger from "@server/logging/Logger";
import { requireDirectory } from "@server/utils/fs";
import BaseProcessor from "./BaseProcessor";

const processors = {};

requireDirectory<{ default: BaseProcessor }>(__dirname).forEach(
  ([module, id]) => {
    if (id === "index") {
      return;
    }
    processors[id] = module.default;
  }
);

glob
  .sync("build/plugins/*/server/processors/!(*.test).js")
  .forEach((filePath: string) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const processor = require(path.join(process.cwd(), filePath)).default;
    const name = path.basename(filePath, ".js");
    processors[name] = processor;
    Logger.debug("processor", `Registered processor ${name}`);
  });

export default processors;
