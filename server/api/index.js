import bodyParser from 'koa-bodyparser';
import httpErrors from 'http-errors';
import Koa from 'koa';
import Router from 'koa-router';
import Sequelize from 'sequelize';

import auth from './auth';
import user from './user';
import collections from './collections';
import documents from './documents';

import validation from './validation';

const api = new Koa();
const router = new Router();

// API error handler
api.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    let message = err.message || err.name;

    if (err instanceof Sequelize.ValidationError) {
      // super basic form error handling
      ctx.status = 400;
      if (err.errors && err.errors[0]) {
        message = `${err.errors[0].message} (${err.errors[0].path})`;
      }
    }

    if (ctx.status === 500) {
      message = 'Internal Server Error';
      ctx.app.emit('error', err, ctx);
    }

    ctx.body = { message };
  }
});

api.use(bodyParser());
api.use(validation());

router.use('/', auth.routes());
router.use('/', user.routes());
router.use('/', collections.routes());
router.use('/', documents.routes());

// Router is embedded in a Koa application wrapper, because koa-router does not
// allow middleware to catch any routes which were not explicitly defined.
api.use(router.routes());

// API 404 handler
api.use(async () => {
  throw httpErrors.NotFound();
});

export default api;