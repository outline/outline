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
export const streamZipResponse = async (
  ctx: Context,
  fileName: string,
  build: (zip: ZipFile) => void | Promise<void>
): Promise<void> => {
  const zip = new ZipFile();
  await build(zip);

  ctx.set("Content-Type", "application/zip");
  ctx.set(
    "Content-Disposition",
    contentDisposition(fileName, { type: "attachment" })
  );

  zip.outputStream.on("error", (err) => {
    ctx.app.emit("error", err, ctx);
    ctx.res.destroy(err);
  });
  ctx.body = zip.outputStream;
  zip.end();
};
