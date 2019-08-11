// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { presentUser, presentTeam, presentPolicies } from '../presenters';
import { Team } from '../models';

const router = new Router();

router.post('auth.info', auth(), async ctx => {
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);

  ctx.body = {
    data: {
      user: presentUser(user, { includeDetails: true }),
      team: presentTeam(team),
    },
    policies: presentPolicies(user, [team]),
  };
});

export default router;
