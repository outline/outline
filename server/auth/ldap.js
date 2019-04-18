// @flow
import Router from 'koa-router';
import { User, Team } from '../models';
import auth from '../middlewares/authentication';
import md5 from 'blueimp-md5';

const router = new Router();

router.get('ldap', auth({ required: false }), async ctx => {
  const { code } = ctx.request.query;
  ctx.assertPresent(code, 'code is required');

  const profile = {uid:"uid", mail:"mail@example.com"};
  const teamName = process.env.LDAP_TEAM || "LDAP";

  const avatarUrl = process.env.LDAP_TEAM_AVATAR || teamAvatarUrl(teamName);

  const [team, isFirstUser] = await Team.findOrCreate({
    where: {
      name: teamName,
    },
    defaults: {
      name: teamName,
      avatarUrl,
    },
  });

  const profileEmail = process.env.LDAP_USER_MAIL_ATTR || 'mail';
  const gravatar = 'https://www.gravatar.com/avatar/' + md5(profileEmail.trim().toLowerCase());

  const [user, isFirstSignin] = await User.findOrCreate({
    where: {
      service: 'ldap',
      serviceId: profile.uid,
      teamId: team.id,
    },
    defaults: {
      name: profile.uid,
      email: profile[profileEmail],
      isAdmin: isFirstUser, //TODO check admin group
      avatarUrl: gravatar,
    },
  });

  if (isFirstUser) {
    await team.provisionFirstCollection(user.id);
    await team.provisionSubdomain(hostname);
  }

  // set cookies on response and redirect to team subdomain
  ctx.signIn(user, team, 'ldap', isFirstSignin);
});

function teamAvatarUrl(teamName) {
  return `https://tiley.herokuapp.com/avatar/ABC/${
    teamName[0]
  }.png`;
}

export default router;
