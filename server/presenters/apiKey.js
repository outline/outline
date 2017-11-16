// @flow
import { type Context } from 'koa';
import { ApiKey } from '../models';

function present(ctx: Context, key: ApiKey) {
  return {
    id: key.id,
    name: key.name,
    secret: key.secret,
  };
}

export default present;
