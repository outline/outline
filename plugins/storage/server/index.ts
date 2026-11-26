import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { toError } from "@shared/utils/error";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  PluginManager,
  PluginPriority,
  Hook,
} from "@server/utils/PluginManager";
import router from "./api/files";

if (env.FILE_STORAGE === "local") {
  const rootDir = env.FILE_STORAGE_LOCAL_ROOT_DIR;
  try {
    if (!existsSync(rootDir)) {
      mkdirSync(rootDir, { recursive: true });
      Logger.debug("utils", `Created ${rootDir} for local storage`);
    }
    checkWritable(rootDir);
  } catch (err) {
    Logger.fatal(
      `Failed to create directory for local file storage at ${env.FILE_STORAGE_LOCAL_ROOT_DIR}`,
      toError(err)
    );
  }
}

const enabled = !!(
  env.FILE_STORAGE_UPLOAD_MAX_SIZE &&
  env.FILE_STORAGE_LOCAL_ROOT_DIR &&
  env.FILE_STORAGE === "local"
);

if (enabled) {
  PluginManager.add([
    {
      name: "Local file storage",
      description: "Plugin for storing files on the local file system",
      type: Hook.API,
      value: router,
      priority: PluginPriority.Normal,
    },
  ]);
}

/**
 * Logs an error that explains how to fix the permissions when the process
 * cannot write to or enter the local file storage directory.
 *
 * @param rootDir the local file storage directory.
 */
function checkWritable(rootDir: string) {
  try {
    accessSync(rootDir, constants.W_OK | constants.X_OK);
  } catch (err) {
    if (process.getuid === undefined || process.getgid === undefined) {
      Logger.error(
        `Local file storage directory ${rootDir} is not writable`,
        toError(err)
      );
      return;
    }

    const uid = process.getuid();
    const gid = process.getgid();
    const owner = statSync(rootDir);

    Logger.error(
      `Local file storage directory ${rootDir} is not writable. Outline runs as uid ${uid} and gid ${gid}, but the directory is owned by uid ${owner.uid} and gid ${owner.gid}. Run "chown -R ${uid}:${gid}" on the directory on the host, or run the container as the directory owner with user: "${owner.uid}:${owner.gid}".`,
      toError(err)
    );
  }
}
