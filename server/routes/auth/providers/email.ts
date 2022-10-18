import Router from "koa-router";
import { find } from "lodash";
import { parseDomain } from "@shared/utils/domains";
import { RateLimiterStrategy } from "@server/RateLimiter";
import InviteAcceptedEmail from "@server/emails/templates/InviteAcceptedEmail";
import SigninEmail from "@server/emails/templates/SigninEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import env from "@server/env";
import { AuthorizationError } from "@server/errors";
import errorHandling from "@server/middlewares/errorHandling";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { User, Team } from "@server/models";
import { signIn } from "@server/utils/authentication";
import { getUserForEmailSigninToken } from "@server/utils/jwt";
import { assertEmail, assertPresent } from "@server/validation";

const router = new Router();

export const config = {
  name: "Email",
  enabled: true,
};

router.post(
  "email",
  errorHandling(),
  rateLimiter(RateLimiterStrategy.TenPerHour),
  async (ctx) => {
    const { email } = ctx.request.body;
    assertEmail(email, "email is required");

    const domain = parseDomain(ctx.request.hostname);

    let team: Team | null | undefined;
    if (env.DEPLOYMENT !== "hosted") {
      team = await Team.scope("withAuthenticationProviders").findOne();
    } else if (domain.custom) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { domain: domain.host },
      });
    } else if (env.SUBDOMAINS_ENABLED && domain.teamSubdomain) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { subdomain: domain.teamSubdomain },
      });
    }

    if (!team?.emailSigninEnabled) {
      throw AuthorizationError();
    }

    const user = await User.scope("withAuthentications").findOne({
      where: {
        teamId: team.id,
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      ctx.body = {
        success: true,
      };
      return;
    }

    // If the user matches an email address associated with an SSO
    // provider then just forward them directly to that sign-in page
    if (user.authentications.length) {
      const authProvider = find(team.authenticationProviders, {
        id: user.authentications[0].authenticationProviderId,
      });
      if (authProvider?.enabled) {
        ctx.body = {
          redirect: `${team.url}/auth/${authProvider?.name}`,
        };
        return;
      }
    }

    // send email to users registered address with a short-lived token
    await SigninEmail.schedule({
      to: user.email,
      token: user.getEmailSigninToken(),
      teamUrl: team.url,
    });
    user.lastSigninEmailSentAt = new Date();
    await user.save();

    // respond with success regardless of whether an email was sent
    ctx.body = {
      success: true,
    };
  }
);

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

    const inviter = await user.$get("invitedBy");
    if (inviter) {
      await InviteAcceptedEmail.schedule({
        to: inviter.email,
        inviterId: inviter.id,
        invitedName: user.name,
        teamUrl: user.team.url,
      });
    }
  }

  // set cookies on response and redirect to team subdomain
  await signIn(ctx, user, user.team, "email", false, false);
});

export default router;
