import Router from "koa-router";
import { Client, NotificationEventType } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import InviteAcceptedEmail from "@server/emails/templates/InviteAcceptedEmail";
import SigninEmail from "@server/emails/templates/SigninEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import env from "@server/env";
import { AuthorizationError } from "@server/errors";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { User, Team } from "@server/models";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { signIn } from "@server/utils/authentication";
import { getUserForEmailSigninToken } from "@server/utils/jwt";
import { assertEmail, assertPresent } from "@server/validation";

const router = new Router();

router.post(
  "email",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  async (ctx) => {
    const { email, client } = ctx.request.body;
    assertEmail(email, "email is required");

    const domain = parseDomain(ctx.request.hostname);

    let team: Team | null | undefined;
    if (!env.isCloudHosted) {
      team = await Team.scope("withAuthenticationProviders").findOne();
    } else if (domain.custom) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { domain: domain.host },
      });
    } else if (domain.teamSubdomain) {
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
      const authenticationProvider =
        user.authentications[0].authenticationProvider;
      ctx.body = {
        redirect: `${team.url}/auth/${authenticationProvider?.name}`,
      };
      return;
    }

    // send email to users email address with a short-lived token
    await new SigninEmail({
      to: user.email,
      token: user.getEmailSigninToken(),
      teamUrl: team.url,
      client: client === Client.Desktop ? Client.Desktop : Client.Web,
    }).schedule();

    user.lastSigninEmailSentAt = new Date();
    await user.save();

    // respond with success regardless of whether an email was sent
    ctx.body = {
      success: true,
    };
  }
);

router.get("email.callback", async (ctx) => {
  const { token, client } = ctx.request.query;
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
    await new WelcomeEmail({
      to: user.email,
      teamUrl: user.team.url,
    }).schedule();

    const inviter = await user.$get("invitedBy");
    if (inviter?.subscribedToEventType(NotificationEventType.InviteAccepted)) {
      await new InviteAcceptedEmail({
        to: inviter.email,
        inviterId: inviter.id,
        invitedName: user.name,
        teamUrl: user.team.url,
      }).schedule();
    }
  }

  // set cookies on response and redirect to team subdomain
  await signIn(ctx, "email", {
    user,
    team: user.team,
    isNewTeam: false,
    isNewUser: false,
    client: client === Client.Desktop ? Client.Desktop : Client.Web,
  });
});

export default router;
