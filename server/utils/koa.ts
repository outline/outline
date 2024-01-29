import formidable from "formidable";
import { Request } from "koa";
import isArray from "lodash/isArray";

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
