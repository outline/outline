import { Next } from "koa";
import { bytesToHumanReadable } from "@shared/utils/files";
import { InvalidRequestError } from "@server/errors";
import { APIContext } from "@server/types";
import { getFileFromRequest } from "@server/utils/koa";

export default function multipart({
  maxAllowedFileSize = 26214400,
}: {
  maxAllowedFileSize: number;
}) {
  return async function multipartMiddleware(ctx: APIContext, next: Next) {
    if (!ctx.is("multipart/form-data")) {
      ctx.throw(
        InvalidRequestError("Request type must be multipart/form-data")
      );
    }

    const file = getFileFromRequest(ctx.request);
    if (!file) {
      ctx.throw(InvalidRequestError("Request must include a file parameter"));
    }

    if (file.size > maxAllowedFileSize) {
      ctx.throw(
        InvalidRequestError(
          `The selected file was larger than the ${bytesToHumanReadable(
            maxAllowedFileSize
          )} maximum size`
        )
      );
    }

    if (!ctx.input) {
      ctx.input = { file };
    } else {
      ctx.input.file = file;
    }
    return next();
  };
}
