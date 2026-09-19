import contentDisposition from "content-disposition";
import type formidable from "formidable";
import type { Context, Request } from "koa";
import { isArray } from "es-toolkit/compat";
import { ZipFile } from "yazl";

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
 * Stream a freshly-built zip archive as the response body. The supplied
 * `build` callback receives a yazl ZipFile to populate with entries; the
 * helper handles response headers, error forwarding, and finalizing the
 * archive once `build` resolves.
 *
 * @param ctx The koa context to write the response to.
 * @param fileName The filename to advertise in the Content-Disposition header.
 * @param build Callback that adds entries to the provided ZipFile.
 */
export const streamZipResponse = (
  ctx: Context,
  fileName: string,
  build: (zip: ZipFile) => void | Promise<void>
): void => {
  const zip = new ZipFile();

  ctx.set("Content-Type", "application/zip");
  ctx.set(
    "Content-Disposition",
    contentDisposition(fileName, { type: "attachment" })
  );

  const handleError = (err: Error) => {
    ctx.app.emit("error", err, ctx);
    ctx.res.destroy(err);
  };

  zip.outputStream.on("error", handleError);
  ctx.body = zip.outputStream;

  void (async () => {
    try {
      await build(zip);
      zip.end();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  })();
};
