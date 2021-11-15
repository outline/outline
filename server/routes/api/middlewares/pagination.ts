import querystring from "querystring";
import { Context } from "koa";

import { InvalidRequestError } from "../../../errors";

export default function pagination(options?: Record<string, any>) {
  return async function paginationMiddleware(
    ctx: Context,
    next: () => Promise<any>
  ) {
    const opts = {
      defaultLimit: 15,
      defaultOffset: 0,
      maxLimit: 100,
      ...options,
    };
    const query = ctx.request.query;
    const body = ctx.request.body;

    let limit = query.limit || body.limit;

    let offset = query.offset || body.offset;

    if (limit && isNaN(limit)) {
      throw new InvalidRequestError(`Pagination limit must be a valid number`);
    }

    if (offset && isNaN(offset)) {
      throw new InvalidRequestError(`Pagination offset must be a valid number`);
    }

    limit = parseInt(limit || opts.defaultLimit, 10);
    offset = parseInt(offset || opts.defaultOffset, 10);

    if (limit > opts.maxLimit) {
      throw new InvalidRequestError(
        `Pagination limit is too large (max ${opts.maxLimit})`
      );
    }

    if (limit <= 0) {
      throw new InvalidRequestError(`Pagination limit must be greater than 0`);
    }

    if (offset < 0) {
      throw new InvalidRequestError(
        `Pagination offset must be greater than or equal to 0`
      );
    }

    ctx.state.pagination = {
      limit,
      offset,
    };

    query.limit = ctx.state.pagination.limit;
    query.offset = ctx.state.pagination.offset + query.limit;

    ctx.state.pagination.nextPath = `/api${
      ctx.request.path
    }?${querystring.stringify(query)}`;
    return next();
  };
}
