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
        ...ctx.input,
        ...schema.parse(ctx.request),
      };
    } catch (err) {
      if (err instanceof ZodError) {
        throw toValidationError(err);
      }
      ctx.throw(toError(err));
    }
    return next();
  };
}

/**
 * Parses the request of the given context with a schema.
 *
 * @param schema the schema to parse the request with.
 * @param ctx the request context.
 * @returns the parsed request.
 * @throws {ValidationError} if the request does not match the schema.
 */
export function validateRequest<T extends z.ZodType<Record<string, unknown>>>(
  schema: T,
  ctx: APIContext
): z.infer<T> {
  try {
    return schema.parse(ctx.request);
  } catch (err) {
    if (err instanceof ZodError) {
      throw toValidationError(err);
    }
    throw err;
  }
}

function toValidationError(err: ZodError) {
  const { path, message } = err.issues[0];
  const errMessage =
    path.length > 0 ? `${String(path[path.length - 1])}: ${message}` : message;
  return ValidationError(errMessage);
}
