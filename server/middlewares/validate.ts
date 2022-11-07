import { Context, Next } from "koa";
import { z } from "zod";
import { ValidationError } from "@server/errors";

export default function validate<T extends z.ZodTypeAny>(schema: T) {
  return async function validateMiddleware(ctx: Context, next: Next) {
    try {
      const validatedBody = schema.parse(ctx.request.body);
      ctx.request.body = { ...validatedBody };
    } catch (err) {
      const { path, message } = err.issues[0];
      const [invalidAttr] = path;
      throw ValidationError(`${invalidAttr}: ${message}`);
    }
    return next();
  };
}
