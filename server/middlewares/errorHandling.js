// @flow
import { type Context } from "koa";
import { snakeCase } from "lodash";
import Sequelize from "sequelize";

export default function errorHandling() {
  return async function errorHandlingMiddleware(
    ctx: Context,
    next: () => Promise<*>
  ) {
    try {
      await next();
    } catch (err) {
      ctx.status = err.status || 500;
      let message = err.message || err.name;
      let error;

      if (err instanceof Sequelize.ValidationError) {
        // super basic form error handling
        ctx.status = 400;
        if (err.errors && err.errors[0]) {
          message = `${err.errors[0].message} (${err.errors[0].path})`;
        }
      }

      if (message.match(/Not found/i)) {
        ctx.status = 404;
        error = "not_found";
      }

      if (message.match(/Authorization error/i)) {
        ctx.status = 403;
        error = "authorization_error";
      }

      if (ctx.status === 500) {
        message = "Internal Server Error";
        error = "internal_server_error";
        ctx.app.emit("error", err, ctx);
      }

      ctx.body = {
        ok: false,
        error: snakeCase(err.id || error),
        status: err.status,
        message,
        data: err.errorData,
      };

      if (!ctx.body.data) {
        delete ctx.body.data;
      }
    }
  };
}
