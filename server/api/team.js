// @flow
import Router from 'koa-router';
import { User, Team } from '../models';
import { publicS3Endpoint } from '../utils/s3';

import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentUser, presentTeam } from '../presenters';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('team.update', auth(), async ctx => {
  const { name, avatarUrl, subdomain, sharing } = ctx.body;
  const endpoint = publicS3Endpoint();

  const user = ctx.state.user;
  const team = await Team.findById(user.teamId);
  authorize(user, 'update', team);

  if (process.env.SUBDOMAINS_ENABLED) {
    team.subdomain = subdomain === '' ? null : subdomain;
  }

  if (name) team.name = name;
  if (sharing !== undefined) team.sharing = sharing;
  if (avatarUrl && avatarUrl.startsWith(`${endpoint}/uploads/${user.id}`)) {
    team.avatarUrl = avatarUrl;
  }
  await team.save();

  ctx.body = { data: await presentTeam(ctx, team) };
});

router.post('team.users', auth(), pagination(), async ctx => {
  const user = ctx.state.user;

  const users = await User.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [['createdAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: users.map(listUser =>
      presentUser(ctx, listUser, { includeDetails: user.isAdmin })
    ),
  };
});

export default router;
