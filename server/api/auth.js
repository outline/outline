// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { presentUser, presentTeam } from '../presenters';
import { Team } from '../models';

const router = new Router();

router.post('auth.info', auth(), async ctx => {
  const user = ctx.state.user;
  const team = await Team.findById(user.teamId);

  ctx.body = {
    data: {
      user: await presentUser(user, { includeDetails: true }),
      team: await presentTeam(ctx, team),
    },
  };
});

export default router;
