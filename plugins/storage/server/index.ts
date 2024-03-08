import { existsSync, mkdirSync } from "fs";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { PluginManager, PluginType } from "@server/utils/PluginManager";
import router from "./api/files";

if (env.FILE_STORAGE === "local") {
  const rootDir = env.FILE_STORAGE_LOCAL_ROOT_DIR;
  try {
    if (!existsSync(rootDir)) {
      mkdirSync(rootDir, { recursive: true });
      Logger.debug("utils", `Created ${rootDir} for local storage`);
    }
  } catch (err) {
    Logger.fatal(
      `Failed to create directory for local file storage at ${env.FILE_STORAGE_LOCAL_ROOT_DIR}`,
      err
    );
  }
}

PluginManager.register(PluginType.API, router, {
  id: "files",
  name: "Local file storage",
  description: "Plugin for storing files on the local file system",
  enabled: !!(
    env.FILE_STORAGE_UPLOAD_MAX_SIZE &&
    env.FILE_STORAGE_LOCAL_ROOT_DIR &&
    env.FILE_STORAGE === "local"
  ),
});
