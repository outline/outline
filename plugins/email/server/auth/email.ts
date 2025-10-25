import Router from "koa-router";
import { Client, NotificationEventType } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import InviteAcceptedEmail from "@server/emails/templates/InviteAcceptedEmail";
import SigninEmail from "@server/emails/templates/SigninEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import env from "@server/env";
import { AuthorizationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { User, Team } from "@server/models";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { VerificationCode } from "@server/utils/VerificationCode";
import { signIn } from "@server/utils/authentication";
import { getUserForEmailSigninToken } from "@server/utils/jwt";
import * as T from "./schema";
import { CSRF } from "@shared/constants";

const router = new Router();

router.post(
  "email",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.EmailSchema),
  async (ctx: APIContext<T.EmailReq>) => {
    const { email, client, preferOTP } = ctx.input.body;

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

    // Generate both a link token and a 6-digit verification code
    const token = preferOTP ? undefined : user.getEmailSigninToken(ctx);
    const verificationCode = preferOTP
      ? await user.getEmailVerificationCode()
      : undefined;

    // send email to users email address with a short-lived token and code
    await new SigninEmail({
      to: user.email,
      token,
      teamUrl: team.url,
      client,
      verificationCode,
    }).schedule();

    user.lastSigninEmailSentAt = new Date();
    await user.save();

    // respond with success regardless of whether an email was sent
    ctx.body = {
      success: true,
    };
  }
);

const emailCallback = async (ctx: APIContext<T.EmailCallbackReq>) => {
  const { query, body } = ctx.input;
  const token = query?.token || body?.token;
  const client = query?.client || body?.client || Client.Web;
  const follow = query?.follow || body?.follow;
  const code = query?.code || body?.code;
  const email = query?.email || body?.email;

  // The link in the email does not include the follow query param, this
  // is to help prevent anti-virus, and email clients from pre-fetching the link
  // and spending the token before the user clicks on it. Instead we redirect
  // to the same URL with the follow query param added from the client side.
  if (!follow) {
    const csrfToken = ctx.cookies.get(CSRF.cookieName);

    // Parse the current URL to extract existing query parameters
    const url = new URL(ctx.request.href);
    const searchParams = url.searchParams;

    // Add new parameters
    searchParams.set("follow", "true");
    if (csrfToken) {
      searchParams.set(CSRF.fieldName, csrfToken);
    }

    // Reconstruct the URL with merged parameters
    url.search = searchParams.toString();

    return ctx.redirectOnClient(url.toString(), "POST");
  }

  let user!: User;

  try {
    if (token) {
      user = await getUserForEmailSigninToken(ctx, token as string);
    } else if (code && email) {
      user = await User.scope("withTeam").findOne({
        rejectOnEmpty: true,
        where: {
          email: email.trim().toLowerCase(),
        },
      });

      const isValid = await VerificationCode.verify(email, code);

      if (!isValid) {
        ctx.redirect(`/?notice=invalid-code`);
        return;
      }

      // Delete the code after successful verification
      await VerificationCode.delete(email);
    } else {
      ctx.redirect("/?notice=auth-error&description=Missing%20token");
      return;
    }
  } catch (err) {
    Logger.debug("authentication", err);
    return ctx.redirect(`/?notice=auth-error&description=${err.message}`);
  }

  if (!user.team.emailSigninEnabled) {
    return ctx.redirect(
      "/?notice=auth-error&description=Disabled%20signin%20method"
    );
  }

  if (user.isSuspended) {
    return ctx.redirect("/?notice=user-suspended");
  }

  if (user.isInvited) {
    await new WelcomeEmail({
      to: user.email,
      role: user.role,
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
    client,
  });
};
router.get(
  "email.callback",
  rateLimiter(RateLimiterStrategy.FivePerMinute),
  validate(T.EmailCallbackSchema),
  emailCallback
);
router.post(
  "email.callback",
  rateLimiter(RateLimiterStrategy.FivePerMinute),
  validate(T.EmailCallbackSchema),
  emailCallback
);

export default router;
