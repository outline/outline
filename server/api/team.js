// @flow
import Router from 'koa-router';
import { Team } from '../models';
import { publicS3Endpoint } from '../utils/s3';

import auth from '../middlewares/authentication';
import { presentTeam } from '../presenters';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('team.update', auth(), async ctx => {
  const { name, avatarUrl, subdomain, sharing, documentEmbeds } = ctx.body;
  const endpoint = publicS3Endpoint();

  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);
  authorize(user, 'update', team);

  if (process.env.SUBDOMAINS_ENABLED === 'true') {
    team.subdomain = subdomain === '' ? null : subdomain;
  }

  if (name) team.name = name;
  if (sharing !== undefined) team.sharing = sharing;
  if (documentEmbeds !== undefined) team.documentEmbeds = documentEmbeds;
  if (avatarUrl && avatarUrl.startsWith(`${endpoint}/uploads/${user.id}`)) {
    team.avatarUrl = avatarUrl;
  }
  await team.save();

  ctx.body = {
    data: presentTeam(team),
  };
});

export default router;
