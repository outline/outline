import { subMinutes } from "date-fns";
import Router from "koa-router";
import { find } from "lodash";
import { parseDomain } from "@shared/utils/domains";
import SigninEmail from "@server/emails/templates/SigninEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import env from "@server/env";
import { AuthorizationError } from "@server/errors";
import errorHandling from "@server/middlewares/errorHandling";
import methodOverride from "@server/middlewares/methodOverride";
import { User, Team } from "@server/models";
import { signIn } from "@server/utils/authentication";
import { getUserForEmailSigninToken } from "@server/utils/jwt";
import { assertEmail, assertPresent } from "@server/validation";

const router = new Router();

export const config = {
  name: "Email",
  enabled: true,
};

router.use(methodOverride());

router.post("email", errorHandling(), async (ctx) => {
  const { email } = ctx.body;
  assertEmail(email, "email is required");
  const users = await User.scope("withAuthentications").findAll({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (users.length) {
    let team!: Team | null;
    const domain = parseDomain(ctx.request.hostname);

    if (domain.custom) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: {
          domain: ctx.request.hostname,
        },
      });
    } else if (env.SUBDOMAINS_ENABLED && domain.teamSubdomain) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: {
          subdomain: domain.teamSubdomain,
        },
      });
    }

    // If there are multiple users with this email address then give precedence
    // to the one that is active on this subdomain/domain (if any)
    let user = users.find((user) => team && user.teamId === team.id);

    // A user was found for the email address, but they don't belong to the team
    // that this subdomain belongs to, we load their team and allow the logic to
    // continue
    if (!user) {
      user = users[0];
      team = await Team.scope("withAuthenticationProviders").findByPk(
        user.teamId
      );
    }

    if (!team) {
      team = await Team.scope("withAuthenticationProviders").findByPk(
        user.teamId
      );
    }

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
        redirect: `${team.url}/auth/${authProvider?.name}`,
      };
      return;
    }

    if (!team.emailSigninEnabled) {
      throw AuthorizationError();
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
    await SigninEmail.schedule({
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
  assertPresent(token, "token is required");

  let user!: User;

  try {
    user = await getUserForEmailSigninToken(token as string);
  } catch (err) {
    ctx.redirect(`/?notice=expired-token`);
    return;
  }

  if (!user.team.emailSigninEnabled) {
    return ctx.redirect("/?notice=auth-error");
  }

  if (user.isSuspended) {
    return ctx.redirect("/?notice=suspended");
  }

  if (user.isInvited) {
    await WelcomeEmail.schedule({
      to: user.email,
      teamUrl: user.team.url,
    });
  }

  await user.update({
    lastActiveAt: new Date(),
  });

  // set cookies on response and redirect to team subdomain
  await signIn(ctx, user, user.team, "email", false, false);
});

export default router;
