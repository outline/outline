import { Next } from "koa";
import { z } from "zod";
import { ValidationError } from "@server/errors";
import { APIContext, BaseReq } from "@server/types";

export default function validate<T extends z.ZodType<BaseReq>>(schema: T) {
  return async function validateMiddleware(
    ctx: APIContext<BaseReq>,
    next: Next
  ) {
    try {
      ctx.input = schema.parse(ctx.request);
    } catch (err) {
      const { path, message } = err.issues[0];
      const errMessage =
        path.length > 0 ? `${path[path.length - 1]}: ${message}` : message;
      throw ValidationError(errMessage);
    }
    return next();
  };
}
