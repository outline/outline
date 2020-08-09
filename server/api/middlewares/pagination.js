// @flow
import querystring from "querystring";
import { type Context } from "koa";
import { InvalidRequestError } from "../../errors";

export default function pagination(options?: Object) {
  return async function paginationMiddleware(
    ctx: Context,
    next: () => Promise<*>
  ) {
    const opts = {
      defaultLimit: 15,
      defaultOffset: 0,
      maxLimit: 100,
      ...options,
    };

    let query = ctx.request.query;
    let body = ctx.request.body;

    // $FlowFixMe
    let limit = query.limit || body.limit;
    // $FlowFixMe
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

    /* $FlowFixMeNowPlease This comment suppresses an error found when upgrading
     * flow-bin@0.104.0. To view the error, delete this comment and run Flow. */
    ctx.state.pagination = {
      limit,
      offset,
    };

    // $FlowFixMe
    query.limit = ctx.state.pagination.limit;
    // $FlowFixMe
    query.offset = ctx.state.pagination.offset + query.limit;

    /* $FlowFixMeNowPlease This comment suppresses an error found when upgrading
     * flow-bin@0.104.0. To view the error, delete this comment and run Flow. */
    ctx.state.pagination.nextPath = `/api${
      ctx.request.path
    }?${querystring.stringify(query)}`;

    return next();
  };
}
