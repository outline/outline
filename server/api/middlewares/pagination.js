import httpErrors from 'http-errors';
var querystring = require('querystring');

export default function pagination(options) {
  return async function paginationMiddleware(ctx, next) {
    const opts = {
      ...{
        defaultLimit: 15,
        maxLimit: 100,
      },
      ...options,
    };

    let query = ctx.request.query;
    let limit = parseInt(query.limit);
    let offset = parseInt(query.offset);
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

    query.limit = ctx.state.pagination.limit;
    query.offset = ctx.state.pagination.offset + query.limit;
    ctx.state.pagination.nextPath =
      '/api' + ctx.request.path + '?' + querystring.stringify(query);

    return next();
  };
}
