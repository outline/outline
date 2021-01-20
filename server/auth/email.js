// @flow
import subMinutes from "date-fns/sub_minutes";
import Router from "koa-router";
import { AuthorizationError } from "../errors";
import mailer from "../mailer";
import auth from "../middlewares/authentication";
import methodOverride from "../middlewares/methodOverride";
import validation from "../middlewares/validation";
import { User, Team } from "../models";
import { getUserForEmailSigninToken } from "../utils/jwt";

const router = new Router();

router.use(methodOverride());
router.use(validation());

router.post("email", async (ctx) => {
  const { email } = ctx.body;

  ctx.assertEmail(email, "email is required");

  const user = await User.findOne({
    where: { email: email.toLowerCase() },
  });

  if (user) {
    const team = await Team.findByPk(user.teamId);
    if (!team) {
      ctx.redirect(`/?notice=auth-error`);
      return;
    }

    // If the user matches an email address associated with an SSO
    // signin then just forward them directly to that service's
    // login page
    if (user.service && user.service !== "email") {
      ctx.body = {
        redirect: `${team.url}/auth/${user.service}`,
      };
      return;
    }

    if (!team.guestSignin) {
      throw new AuthorizationError();
    }

    // basic rate limit of endpoint to prevent send email abuse
    if (
      user.lastSigninEmailSentAt &&
      user.lastSigninEmailSentAt > subMinutes(new Date(), 2)
    ) {
      ctx.body = {
        redirect: `${team.url}?notice=email-auth-ratelimit`,
        message: "Rate limit exceeded",
        success: false,
      };
      return;
    }

    // send email to users registered address with a short-lived token
    mailer.signin({
      to: user.email,
      token: user.getEmailSigninToken(),
      teamUrl: team.url,
    });

    user.lastSigninEmailSentAt = new Date();
    await user.save();
  }

  // respond with success regardless of whether an email was sent
  ctx.body = {
    success: true,
  };
});

router.get("email.callback", auth({ required: false }), async (ctx) => {
  const { token } = ctx.request.query;

  ctx.assertPresent(token, "token is required");

  try {
    const user = await getUserForEmailSigninToken(token);

    const team = await Team.findByPk(user.teamId);
    if (!team.guestSignin) {
      throw new AuthorizationError();
    }

    if (!user.service) {
      user.service = "email";
      user.lastActiveAt = new Date();
      await user.save();
    }

    // set cookies on response and redirect to team subdomain
    ctx.signIn(user, team, "email", false);
  } catch (err) {
    ctx.redirect(`${process.env.URL}?notice=expired-token`);
  }
});

export default router;
