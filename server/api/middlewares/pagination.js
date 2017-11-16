// @flow
import httpErrors from 'http-errors';
import querystring from 'querystring';
import { type Context } from 'koa';

export default function pagination(options?: Object) {
  return async function paginationMiddleware(
    ctx: Context,
    next: () => Promise<void>
  ) {
    const opts = {
      defaultLimit: 15,
      maxLimit: 100,
      ...options,
    };

    let query = ctx.request.query;
    let body = ctx.request.body;
    // $FlowFixMe
    let limit = parseInt(query.limit || body.limit, 10);
    // $FlowFixMe
    let offset = parseInt(query.offset || body.offset, 10);
    limit = isNaN(limit) ? opts.defaultLimit : limit;
    offset = isNaN(offset) ? 0 : offset;

    if (limit > opts.maxLimit) {
      throw httpErrors.BadRequest(
        `Pagination limit is too large (max ${opts.maxLimit})`
      );
    }

    ctx.state.pagination = {
      limit: limit,
      offset: offset,
    };

    // $FlowFixMe
    query.limit = ctx.state.pagination.limit;
    // $FlowFixMe
    query.offset = ctx.state.pagination.offset + query.limit;
    ctx.state.pagination.nextPath = `/api${
      ctx.request.path
    }?${querystring.stringify(query)}`;

    return next();
  };
}
