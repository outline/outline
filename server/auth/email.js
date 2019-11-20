// @flow
import Router from 'koa-router';
import mailer from '../mailer';
import { getUserForEmailSigninToken } from '../utils/jwt';
import { User, Team } from '../models';
import methodOverride from '../api/middlewares/methodOverride';
import validation from '../middlewares/validation';
import auth from '../middlewares/authentication';

const router = new Router();

router.use(methodOverride());
router.use(validation());

router.get('email', async ctx => {
  const { email } = ctx.body;

  ctx.assertEmail(email, 'email is required');

  // attempt to find a user with matching email and no OAuth signin
  const user = await User.findOne({
    where: {
      email,
      service: 'email',
    },
  });

  // TODO: Rate limit this endpoint

  // send email to users registered address with a login token
  if (user) {
    mailer.signin({
      to: user.email,
      token: user.getEmailSigninToken(),
    });
  }

  // respond with success regardless of whether an email was sent
  // so we don't leak the existence of users to the outside world.
  ctx.body = {
    success: true,
  };
});

router.get('email.callback', auth({ required: false }), async ctx => {
  const { token } = ctx.request.query;

  ctx.assertPresent(token, 'token is required');

  const user = await getUserForEmailSigninToken(token);
  const team = await Team.findOne({
    where: { id: user.teamId },
  });

  // set cookies on response and redirect to team subdomain
  ctx.signIn(user, team, undefined, false);
});

export default router;
