import { Next } from "koa";
import { z } from "zod";
import { ValidationError } from "@server/errors";
import { APIContext } from "@server/types";

export default function validate<T extends z.ZodTypeAny>(schema: T) {
  return async function validateMiddleware(ctx: APIContext<T>, next: Next) {
    try {
      ctx.input = schema.parse(ctx.request.body);
    } catch (err) {
      const { path, message } = err.issues[0];
      const [invalidAttr] = path;
      throw ValidationError(`${invalidAttr}: ${message}`);
    }
    return next();
  };
}
