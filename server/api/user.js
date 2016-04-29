import Router from 'koa-router';

import auth from './authentication';
import { presentUser } from '../presenters';
import { User } from '../models';

const router = new Router();

router.post('user.info', auth(), async (ctx) => {
  ctx.body = { data: presentUser(ctx.state.user) };
});

export default router;