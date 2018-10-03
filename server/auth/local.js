// @flow
import Router from 'koa-router';
import addMonths from 'date-fns/add_months';
import { User, Team } from '../models';

const router = new Router();

router.get('local', async ctx => {
  const [team, isFirstUser] = await Team.findOrCreate({
    where: {
      name: 'Local',
    },
  });

  const [user] = await User.findOrCreate({
    where: {
      service: 'local',
      serviceId: 'admin',
      teamId: team.id,
    },
    defaults: {
      name: 'admin',
      email: 'admin@example.com',
      isAdmin: isFirstUser,
    },
  });

  if (isFirstUser) {
    await team.createFirstCollection(user.id);
  }

  // not awaiting the promise here so that the request is not blocked
  user.updateSignedIn(ctx.request.ip);

  ctx.cookies.set('lastSignedIn', 'local', {
    httpOnly: false,
    expires: new Date('2100'),
  });
  ctx.cookies.set('accessToken', user.getJwtToken(), {
    httpOnly: false,
    expires: addMonths(new Date(), 1),
  });

  ctx.redirect('/');
});

export default router;
