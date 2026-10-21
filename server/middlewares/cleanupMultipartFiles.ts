import fs from "node:fs/promises";
import type { Next } from "koa";
import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import type { AppContext } from "@server/types";

/**
 * Removes temporary files created while parsing a multipart request.
 *
 * @returns the middleware function.
 */
export default function cleanupMultipartFiles() {
  return async function cleanupMultipartFilesMiddleware(
    ctx: AppContext,
    next: Next
  ) {
    const filePaths = Object.values(ctx.request.files ?? {})
      .flat()
      .map((file) => file.filepath);

    try {
      await next();
    } finally {
      await Promise.all(
        filePaths.map(async (filePath) => {
          try {
            await fs.rm(filePath, { force: true });
          } catch (error) {
            Logger.error("Failed to remove temporary upload", toError(error), {
              filePath,
            });
          }
        })
      );
    }
  };
}
