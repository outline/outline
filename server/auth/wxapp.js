// @flow
import Router from 'koa-router';
import { User, Team } from '../models';
import auth from '../middlewares/authentication';

const router = new Router();

// signin callback from wxapp(Authing)
router.get('wxapp.callback', auth({ required: false }), async ctx => {
  const { code, data, teamId } = ctx.request.query;
  ctx.assertPresent(code, 'code is required');

  if (parseInt(code) != 200) {
    ctx.redirect('/?notice=auth-error');
    return;
  }

  const { photo, _id, username, email } = JSON.parse(data);

  const hostname = _id;

  if (teamId) {
    const teams = await Team.find({
      where: {
        id: teamId,
      },
    });

    const team = teams.dataValues;

    const [user, isFirstSignin] = await User.findOrCreate({
      where: {
        service: 'wxapp',
        serviceId: _id,
        teamId: team.id,
      },
      defaults: {
        name: username,
        email: email || '',
        isAdmin: false,
        avatarUrl: photo,
      },
    });
  
    // set cookies on response and redirect to team subdomain
    ctx.signIn(user, team, 'wxapp', isFirstSignin);  
  } else {
    const [team, isFirstUser] = await Team.findOrCreate({
      where: {
        googleId: _id,
      },
      defaults: {
        name: _id.substr(0, 8) + '-ego',
        avatarUrl: photo,
      },
    });
  
    const [user, isFirstSignin] = await User.findOrCreate({
      where: {
        service: 'wxapp',
        serviceId: _id,
        teamId: team.id,
      },
      defaults: {
        name: username,
        email: email || '',
        isAdmin: isFirstUser,
        avatarUrl: photo,
      },
    });
  
    if (isFirstUser) {
      await team.provisionFirstCollection(user.id);
      await team.provisionSubdomain(hostname);
    }
  
    // set cookies on response and redirect to team subdomain
    ctx.signIn(user, team, 'wxapp', isFirstSignin);
  }
});

export default router;
