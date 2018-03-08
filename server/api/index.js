// @flow
import bodyParser from 'koa-bodyparser';
import Koa from 'koa';
import Router from 'koa-router';
import Sequelize from 'sequelize';
import _ from 'lodash';

import auth from './auth';
import user from './user';
import collections from './collections';
import documents from './documents';
import views from './views';
import hooks from './hooks';
import apiKeys from './apiKeys';
import team from './team';
import integrations from './integrations';

import validation from './middlewares/validation';
import methodOverride from '../middlewares/methodOverride';
import cache from '../middlewares/cache';
import apiWrapper from './middlewares/apiWrapper';

const api = new Koa();
const router = new Router();

// API error handler
api.use(async (ctx, next) => {
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

    if (message.match('Authorization error')) {
      ctx.status = 403;
      error = 'authorization_error';
    }

    if (ctx.status === 500) {
      message = 'Internal Server Error';
      error = 'internal_server_error';
      ctx.app.emit('error', err, ctx);
    }

    ctx.body = {
      ok: false,
      error: _.snakeCase(err.id || error),
      status: err.status,
      message,
      data: err.errorData ? err.errorData : undefined,
    };
  }
});

api.use(bodyParser());
api.use(methodOverride());
api.use(cache());
api.use(validation());
api.use(apiWrapper());

router.use('/', auth.routes());
router.use('/', user.routes());
router.use('/', collections.routes());
router.use('/', documents.routes());
router.use('/', views.routes());
router.use('/', hooks.routes());
router.use('/', apiKeys.routes());
router.use('/', team.routes());
router.use('/', integrations.routes());

// Router is embedded in a Koa application wrapper, because koa-router does not
// allow middleware to catch any routes which were not explicitly defined.
api.use(router.routes());

export default api;
