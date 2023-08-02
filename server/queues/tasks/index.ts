import path from "path";
import { glob } from "glob";
import Logger from "@server/logging/Logger";
import { requireDirectory } from "@server/utils/fs";
import BaseTask from "./BaseTask";

const tasks = {};

requireDirectory<{ default: BaseTask<any> }>(__dirname).forEach(
  ([module, id]) => {
    if (id === "index") {
      return;
    }
    tasks[id] = module.default;
  }
);

glob
  .sync("build/plugins/*/server/tasks/!(*.test).js")
  .forEach((filePath: string) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const task = require(path.join(process.cwd(), filePath)).default;
    const name = path.basename(filePath, ".js");
    tasks[name] = task;
    Logger.debug("task", `Registered task ${name}`);
  });

export default tasks;
