// @flow
import * as React from 'react';
import Router from 'koa-router';
import { User, Team } from '../../models';
import auth from '../../middlewares/authentication';
import md5 from 'blueimp-md5';
import getUser from './ldapGetUser';
import LdapSignin from '../../pages/LdapSignin';
import renderpage from '../../utils/renderpage';

const router = new Router();

router.get('ldap', auth({ required: false }), async ctx => {
  return renderpage(
    ctx,
    <LdapSignin
      notice={ctx.request.query.notice}
      error={ctx.request.query.error}
    />
  );
});

router.get('ldap.callback', auth({ required: false }), async ctx => {
  const { name, pass } = ctx.request.query;
  ctx.assertPresent(name, 'name is required');
  ctx.assertPresent(pass, 'pass is required');

  let profile;
  try {
    profile = await getUser(name, pass);
  } catch (err) {
    ctx.redirect(
      `ldap?notice=auth-error&error=${encodeURIComponent(err.message)}`
    );
    return;
  }
  const accessGroup = process.env.LDAP_ACCESS_GROUP || '';

  if (accessGroup !== '' && profile.groups.indexOf(accessGroup) === -1) {
    ctx.redirect(
      `ldap?notice=auth-error&error=${encodeURIComponent(
        'You are not allowed to sign in.'
      )}`
    );
    return;
  }

  const teamName = process.env.LDAP_TEAM || 'LDAP';

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

  const email = process.env.LDAP_USER_MAIL_ATTR || 'mail';
  const gravatar =
    'https://www.gravatar.com/avatar/' +
    md5(profile[email].trim().toLowerCase());

  const adminGroup = process.env.LDAP_ADMIN_GROUP || '';

  var isAdmin = false;

  if (adminGroup !== '' && profile.groups.indexOf(adminGroup) > -1) {
    isAdmin = true;
  } else {
    isAdmin = isFirstUser;
  }

  const [user, isFirstSignin] = await User.findOrCreate({
    where: {
      service: 'ldap',
      serviceId: profile.uid,
      teamId: team.id,
    },
    defaults: {
      name: profile.uid,
      email: profile[email],
      isAdmin: isAdmin,
      avatarUrl: gravatar,
    },
  });

  if (isFirstUser) {
    await team.provisionFirstCollection(user.id);
    await team.provisionSubdomain('ldap');
  }

  // set cookies on response and redirect to team subdomain
  ctx.signIn(user, team, 'ldap', isFirstSignin);
});

function teamAvatarUrl(teamName) {
  return `https://tiley.herokuapp.com/avatar/ABC/${teamName[0]}.png`;
}

export default router;
