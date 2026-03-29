import type { Next } from "koa";
import { bytesToHumanReadable } from "@shared/utils/files";
import { InvalidRequestError } from "@server/errors";
import type { APIContext } from "@server/types";
import { getFileFromRequest } from "@server/utils/koa";

export default function multipart({
  maximumFileSize,
  optional = false,
}: {
  maximumFileSize: number;
  /** When true, non-multipart requests pass through with file set to undefined. */
  optional?: boolean;
}) {
  return async function multipartMiddleware(ctx: APIContext, next: Next) {
    if (!ctx.is("multipart/form-data")) {
      if (optional) {
        return next();
      }
      ctx.throw(
        InvalidRequestError("Request type must be multipart/form-data")
      );
    }

    const file = getFileFromRequest(ctx.request);
    if (!file) {
      ctx.throw(InvalidRequestError("Request must include a file parameter"));
    }

    if (file.size > maximumFileSize) {
      ctx.throw(
        InvalidRequestError(
          `The selected file was larger than the ${bytesToHumanReadable(
            maximumFileSize
          )} maximum size`
        )
      );
    }

    ctx.input = { ...(ctx.input ?? {}), file };
    return next();
  };
}
