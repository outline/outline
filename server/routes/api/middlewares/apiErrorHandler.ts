import type { Context, Next } from "koa";
import {
  ValidationError as SequelizeValidationError,
  EmptyResultError as SequelizeEmptyResultError,
  DatabaseError as SequelizeDatabaseError,
} from "sequelize";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@server/errors";

/** Postgres codes for a requested date the database cannot represent. */
const DATE_RANGE_ERROR_CODES = new Set(["22008", "22015"]);

/**
 * Reads the SQLSTATE code from the driver error a DatabaseError wraps.
 *
 * @param err the Sequelize error to inspect.
 * @returns the SQLSTATE code, or undefined if the driver did not supply one.
 */
function sqlStateOf(err: SequelizeDatabaseError): string | undefined {
  const { parent } = err;
  if (parent && "code" in parent && typeof parent.code === "string") {
    return parent.code;
  }
  return undefined;
}

export default function apiErrorHandler() {
  return async function apiErrorHandlerMiddleware(ctx: Context, next: Next) {
    try {
      await next();
    } catch (err) {
      let transformedErr = err;

      if (
        !(err instanceof AuthorizationError) &&
        err instanceof Error &&
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
        err instanceof SequelizeDatabaseError &&
        DATE_RANGE_ERROR_CODES.has(sqlStateOf(err) ?? "")
      ) {
        transformedErr = ValidationError(
          "Date value in request is out of range"
        );
      }

      if (
        (err instanceof Error && "code" in err && err.code === "ENOENT") ||
        err instanceof SequelizeEmptyResultError ||
        (err instanceof Error && /Not found/i.test(err.message))
      ) {
        transformedErr = NotFoundError();
      }

      throw transformedErr;
    }
  };
}
