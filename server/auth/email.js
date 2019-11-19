// @flow
import Sequelize from 'sequelize';
import Router from 'koa-router';
import mailer from '../mailer';
import { getUserForEmailSigninToken } from '../utils/jwt';
import { User, Team } from '../models';

const Op = Sequelize.Op;
const router = new Router();

router.get('email', async ctx => {
  const { email } = ctx.body;

  const user = await User.findOne({
    where: {
      email,
      serviceId: {
        [Op.eq]: null,
      },
    },
  });

  // TODO: Account for not finding viable user
  // TODO: Rate limit this endpoint

  // send email to users registered address with a login token
  mailer.signin({
    to: user.email,
    token: user.getEmailSigninToken(),
  });

  // respond with success regardless of whether an email was sent
  // so we don't leak the existence of users to the outside world.
  ctx.body = {
    success: true,
  };
});

router.get('email.callback', async ctx => {
  const { token } = ctx.request.query;
  const user = await getUserForEmailSigninToken(token);
  const team = await Team.findOne({
    where: { id: user.teamId },
  });

  // set cookies on response and redirect to team subdomain
  ctx.signIn(user, team, undefined, false);
});

export default router;
