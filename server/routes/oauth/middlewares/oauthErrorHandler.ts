import { Context, Next } from "koa";
import {
  ValidationError as SequelizeValidationError,
  EmptyResultError as SequelizeEmptyResultError,
} from "sequelize";

/**
 * To adhere to the OAuth 2.0 specification, errors from the /token and /authorize routes
 * follow the snake_case convention with `error` and `error_description` keys, rather than
 * our standard error format.
 */
export default function oauthErrorHandler() {
  return async function oauthErrorHandlerMiddleware(ctx: Context, next: Next) {
    try {
      await next();
    } catch (err) {
      if (err instanceof SequelizeEmptyResultError) {
        ctx.status = 404;
        ctx.body = {
          error: "invalid_request",
          error_description: "Resource not found",
        };
        return;
      }
      if (err instanceof SequelizeValidationError) {
        ctx.status = 400;
        ctx.body = {
          error: "invalid_request",
          error_description: err.errors[0].message,
        };
        return;
      }

      ctx.status = err.status || err.statusCode || err.code || 500;
      // Map common HTTP status codes to OAuth error types
      let errorType = "server_error";
      if (ctx.status === 400) {
        errorType = "invalid_request";
      } else if (ctx.status === 401) {
        errorType = "invalid_client";
      }

      ctx.body = {
        error: errorType,
        error_description: err.message,
      };
    }
  };
}
