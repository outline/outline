// @flow
import subMinutes from "date-fns/sub_minutes";
import Router from "koa-router";
import { find } from "lodash";
import { AuthorizationError } from "../../errors";
import mailer from "../../mailer";
import methodOverride from "../../middlewares/methodOverride";
import validation from "../../middlewares/validation";
import { User, Team } from "../../models";
import { signIn } from "../../utils/authentication";
import { getUserForEmailSigninToken } from "../../utils/jwt";

const router = new Router();

export const config = {
  name: "Email",
  enabled: true,
};

router.use(methodOverride());
router.use(validation());

router.post("email", async (ctx) => {
  const { email } = ctx.body;

  ctx.assertEmail(email, "email is required");

  const user = await User.scope("withAuthentications").findOne({
    where: { email: email.toLowerCase() },
  });

  if (user) {
    const team = await Team.scope("withAuthenticationProviders").findByPk(
      user.teamId
    );
    if (!team) {
      ctx.redirect(`/?notice=auth-error`);
      return;
    }

    // If the user matches an email address associated with an SSO
    // provider then just forward them directly to that sign-in page
    if (user.authentications.length) {
      const authProvider = find(team.authenticationProviders, {
        id: user.authentications[0].authenticationProviderId,
      });
      ctx.body = {
        redirect: `${team.url}/auth/${authProvider.name}`,
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

router.get("email.callback", async (ctx) => {
  const { token } = ctx.request.query;

  ctx.assertPresent(token, "token is required");

  try {
    const user = await getUserForEmailSigninToken(token);
    if (!user.team.guestSignin) {
      return ctx.redirect("/?notice=auth-error");
    }
    if (user.isSuspended) {
      return ctx.redirect("/?notice=suspended");
    }

    await user.update({ lastActiveAt: new Date() });

    // set cookies on response and redirect to team subdomain
    await signIn(ctx, user, user.team, "email", false, false);
  } catch (err) {
    ctx.redirect(`/?notice=expired-token`);
  }
});

export default router;
