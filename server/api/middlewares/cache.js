// @flow
import debug from "debug";
import { type Context } from "koa";

const log = debug("cache");

export default function cache() {
  return async function cacheMiddleware(ctx: Context, next: () => Promise<*>) {
    ctx.cache = {};

    ctx.cache.set = async (id, value) => {
      ctx.cache[id] = value;
    };

    ctx.cache.get = async (id, def) => {
      if (ctx.cache[id]) {
        log(`hit: ${id}`);
      } else {
        log(`miss: ${id}`);
        ctx.cache.set(id, await def());
      }
      return ctx.cache[id];
    };
    return next();
  };
}
