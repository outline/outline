// @flow
import Router from 'koa-router';
import mailer from '../mailer';
import subMinutes from 'date-fns/sub_minutes';
import { getUserForEmailSigninToken } from '../utils/jwt';
import { User, Team } from '../models';
import methodOverride from '../middlewares/methodOverride';
import validation from '../middlewares/validation';
import auth from '../middlewares/authentication';
import { AuthorizationError, InvalidRequestError } from '../errors';

const router = new Router();

router.use(methodOverride());
router.use(validation());

router.post('email', async ctx => {
  const { email } = ctx.body;

  ctx.assertEmail(email, 'email is required');

  // attempt to find a user with matching email and no OAuth signin
  const user = await User.findOne({
    where: { email },
  });

  if (user) {
    const team = await Team.findByPk(user.teamId);

    // If the user matches an email address associated with an SSO
    // signin then just forward them directly to that service
    if (user.service !== 'email') {
      return ctx.redirect(`${team.url}/auth/${user.service}`);
    }

    if (!team.guestSignin) {
      throw new AuthorizationError();
    }

    // rate limit endpoint to 1/min
    if (
      user.lastSigninEmailSentAt &&
      user.lastSigninEmailSentAt > subMinutes(new Date(), 2)
    ) {
      throw new InvalidRequestError(
        'An email login link was recently sent, try again in a few minutes'
      );
    }

    // send email to users registered address with a login token
    mailer.signin({
      to: user.email,
      token: user.getEmailSigninToken(),
      teamUrl: team.url,
    });

    user.lastSigninEmailSentAt = new Date();
    await user.save();

    // respond with success regardless of whether an email was sent
    ctx.redirect(`${team.url}?notice=guest-success`);
  } else {
    ctx.redirect(`${process.env.URL}?notice=guest-success`);
  }
});

router.get('email.callback', auth({ required: false }), async ctx => {
  const { token } = ctx.request.query;

  ctx.assertPresent(token, 'token is required');

  const user = await getUserForEmailSigninToken(token);
  const team = await Team.findByPk(user.teamId);
  if (!team.guestSignin) {
    throw new AuthorizationError();
  }

  // set cookies on response and redirect to team subdomain
  ctx.signIn(user, team, undefined, false);
});

export default router;
