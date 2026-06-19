import type { Next } from "koa";
import type { z } from "zod";
import { ZodError } from "zod";
import { toError } from "@shared/utils/error";
import { ValidationError } from "@server/errors";
import type { APIContext } from "@server/types";

export default function validate<T extends z.ZodType<Record<string, unknown>>>(
  schema: T
) {
  return async function validateMiddleware(ctx: APIContext, next: Next) {
    try {
      ctx.input = {
        ...(ctx.input ?? {}),
        ...schema.parse(ctx.request),
      };
    } catch (err) {
      if (err instanceof ZodError) {
        const { path, message } = err.issues[0];
        const errMessage =
          path.length > 0
            ? `${String(path[path.length - 1])}: ${message}`
            : message;
        throw ValidationError(errMessage);
      }
      ctx.throw(toError(err));
    }
    return next();
  };
}
