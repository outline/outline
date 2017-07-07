// @flow
import debug from 'debug';

const debugCache = debug('cache');

export default function cache() {
  return async function cacheMiddleware(ctx: Object, next: Function) {
    ctx.cache = {};

    ctx.cache.set = async (id, value) => {
      ctx.cache[id] = value;
    };

    ctx.cache.get = async (id, def) => {
      if (ctx.cache[id]) {
        debugCache(`hit: ${id}`);
      } else {
        debugCache(`miss: ${id}`);
        ctx.cache.set(id, await def());
      }
      return ctx.cache[id];
    };
    return next();
  };
}
