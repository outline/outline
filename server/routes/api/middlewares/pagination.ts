import querystring from "querystring";
import { Next } from "koa";
import { Pagination } from "@shared/constants";
import { InvalidRequestError } from "@server/errors";
import { AppContext } from "@server/types";

export default function pagination() {
  return async function paginationMiddleware(ctx: AppContext, next: Next) {
    const opts = {
      defaultLimit: Pagination.defaultLimit,
      defaultOffset: Pagination.defaultOffset,
      maxLimit: Pagination.maxLimit,
    };
    const query = ctx.request.query;
    const body = ctx.request.body;
    let limit = query.limit || body.limit;
    let offset = query.offset || body.offset;

    if (limit && isNaN(limit)) {
      throw InvalidRequestError(`Pagination limit must be a valid number`);
    }

    if (offset && isNaN(offset)) {
      throw InvalidRequestError(`Pagination offset must be a valid number`);
    }

    limit = parseInt(limit || opts.defaultLimit, 10);
    offset = parseInt(offset || opts.defaultOffset, 10);

    if (limit > opts.maxLimit) {
      throw InvalidRequestError(
        `Pagination limit is too large (max ${opts.maxLimit})`
      );
    }

    if (limit <= 0) {
      throw InvalidRequestError(`Pagination limit must be greater than 0`);
    }

    if (offset < 0) {
      throw InvalidRequestError(
        `Pagination offset must be greater than or equal to 0`
      );
    }

    query.limit = String(limit);
    query.offset = String(limit + offset);

    ctx.state.pagination = {
      limit,
      offset,
      nextPath: `/api${ctx.request.path}?${querystring.stringify(query)}`,
    };

    return next();
  };
}
