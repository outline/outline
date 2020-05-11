// @flow
import bodyParser from 'koa-bodyparser';
import Koa from 'koa';
import Router from 'koa-router';

import auth from './auth';
import events from './events';
import users from './users';
import collections from './collections';
import documents from './documents';
import views from './views';
import hooks from './hooks';
import apiKeys from './apiKeys';
import shares from './shares';
import groups from './groups';
import team from './team';
import integrations from './integrations';
import notificationSettings from './notificationSettings';
import utils from './utils';
import attachments from './attachments';

import { NotFoundError } from '../errors';
import errorHandling from '../middlewares/errorHandling';
import validation from '../middlewares/validation';
import methodOverride from '../middlewares/methodOverride';
import cache from './middlewares/cache';
import apiWrapper from './middlewares/apiWrapper';
import editor from './middlewares/editor';

const api = new Koa();
const router = new Router();

// middlewares
api.use(errorHandling());
api.use(bodyParser());
api.use(methodOverride());
api.use(cache());
api.use(validation());
api.use(apiWrapper());
api.use(editor());

// routes
router.use('/', auth.routes());
router.use('/', events.routes());
router.use('/', users.routes());
router.use('/', collections.routes());
router.use('/', documents.routes());
router.use('/', views.routes());
router.use('/', hooks.routes());
router.use('/', apiKeys.routes());
router.use('/', shares.routes());
router.use('/', team.routes());
router.use('/', integrations.routes());
router.use('/', notificationSettings.routes());
router.use('/', attachments.routes());
router.use('/', utils.routes());
router.use('/', groups.routes());

router.post('*', ctx => {
  ctx.throw(new NotFoundError('Endpoint not found'));
});

// Router is embedded in a Koa application wrapper, because koa-router does not
// allow middleware to catch any routes which were not explicitly defined.
api.use(router.routes());

export default api;
