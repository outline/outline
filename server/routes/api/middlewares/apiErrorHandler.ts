import { Context, Next } from "koa";
import {
  ValidationError as SequelizeValidationError,
  EmptyResultError as SequelizeEmptyResultError,
} from "sequelize";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@server/errors";

export default function apiErrorHandler() {
  return async function apiErrorHandlerMiddleware(ctx: Context, next: Next) {
    try {
      await next();
    } catch (err) {
      let transformedErr = err;

      if (
        !(err instanceof AuthorizationError) &&
        /Authorization error/i.test(err.message)
      ) {
        transformedErr = AuthorizationError();
      }

      if (err instanceof SequelizeValidationError) {
        if (err.errors && err.errors[0]) {
          transformedErr = ValidationError(
            `${err.errors[0].message} (${err.errors[0].path})`
          );
        } else {
          transformedErr = ValidationError();
        }
      }

      if (
        err.code === "ENOENT" ||
        err instanceof SequelizeEmptyResultError ||
        /Not found/i.test(err.message)
      ) {
        transformedErr = NotFoundError();
      }

      throw transformedErr;
    }
  };
}
