import type { ServerResponse } from "node:http";
import contentDisposition from "content-disposition";
import type formidable from "formidable";
import type { Request } from "koa";
import { isArray } from "es-toolkit/compat";
import { ZipFile } from "yazl";
import type { AppContext } from "@server/types";

/**
 * Get the first file from an incoming koa request
 *
 * @param request The incoming request
 * @returns The first file or undefined
 */
export const getFileFromRequest = (
  request: Request
): formidable.File | undefined => {
  const { files } = request;
  if (!files) {
    return undefined;
  }

  const file = Object.values(files)[0];
  if (!file) {
    return undefined;
  }

  return isArray(file) ? file[0] : file;
};

/**
 * Get a signal that aborts when the client connection closes before the
 * response is sent in full, so that work for an abandoned request can stop.
 *
 * @param res The response of the request.
 * @returns A signal that aborts when the client disconnects.
 */
export const getClientAbortSignal = (res: ServerResponse): AbortSignal => {
  const controller = new AbortController();

  if (res.destroyed && !res.writableFinished) {
    controller.abort();
    return controller.signal;
  }

  res.once("close", () => {
    if (!res.writableFinished) {
      controller.abort();
    }
  });
  return controller.signal;
};

/**
 * Stream a freshly-built zip archive as the response body. The supplied
 * `build` callback receives a yazl ZipFile to populate with entries; the
 * helper handles response headers, error forwarding, and finalizing the
 * archive once `build` resolves.
 *
 * @param ctx The koa context to write the response to.
 * @param fileName The filename to advertise in the Content-Disposition header.
 * @param build Callback that adds entries to the provided ZipFile, and
 *   receives a signal that aborts when the client disconnects.
 */
export const streamZipResponse = (
  ctx: AppContext,
  fileName: string,
  build: (zip: ZipFile, signal: AbortSignal) => void | Promise<void>
): void => {
  const zip = new ZipFile();
  const signal = getClientAbortSignal(ctx.res);

  ctx.set("Content-Type", "application/zip");
  ctx.set(
    "Content-Disposition",
    contentDisposition(fileName, { type: "attachment" })
  );

  let failed = false;
  const handleError = (err: Error) => {
    if (failed) {
      return;
    }
    failed = true;
    ctx.app.emit("error", err, ctx);
    ctx.res.destroy(err);
  };

  zip.on("error", handleError);
  zip.outputStream.on("error", handleError);
  ctx.body = zip.outputStream;

  void (async () => {
    try {
      await build(zip, signal);
      zip.end();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  })();
};
