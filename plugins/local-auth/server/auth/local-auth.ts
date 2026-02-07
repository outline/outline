import Router from "koa-router";
import { NotificationEventType } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import InviteAcceptedEmail from "@server/emails/templates/InviteAcceptedEmail";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { User, Team } from "@server/models";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { signIn } from "@server/utils/authentication";
import * as T from "./schema";

const router = new Router();

/**
 * Find the team based on the request hostname for both self-hosted and
 * cloud-hosted deployments.
 *
 * @param ctx - the koa request context.
 * @returns the team, or null if not found.
 */
async function findTeam(ctx: APIContext): Promise<Team | null> {
  const domain = parseDomain(ctx.request.hostname);

  if (!env.isCloudHosted) {
    return Team.scope("withAuthenticationProviders").findOne();
  }
  if (domain.custom) {
    return Team.scope("withAuthenticationProviders").findOne({
      where: { domain: domain.host },
    });
  }
  if (domain.teamSubdomain) {
    return Team.scope("withAuthenticationProviders").findOne({
      where: { subdomain: domain.teamSubdomain },
    });
  }
  return null;
}

router.post(
  "local-auth",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.LocalAuthSigninSchema),
  async (ctx: APIContext<T.LocalAuthSigninReq>) => {
    const { email, password, client } = ctx.input.body;

    try {
      const team = await findTeam(ctx);
      if (!team?.localAuthEnabled) {
        ctx.redirect("/?notice=auth-error&description=Local%20auth%20is%20not%20enabled");
        return;
      }

      const user = await User.scope("withTeam").findOne({
        where: {
          teamId: team.id,
          email: email.toLowerCase(),
        },
      });

      if (!user || !user.hasPassword || !user.verifyPassword(password)) {
        ctx.redirect("/?notice=auth-error&description=Invalid%20email%20or%20password");
        return;
      }

      if (user.isSuspended) {
        ctx.redirect("/?notice=user-suspended");
        return;
      }

      if (user.isInvited) {
        if (env.EMAIL_ENABLED) {
          await new WelcomeEmail({
            to: user.email,
            role: user.role,
            teamUrl: user.team.url,
          }).schedule();

          const inviter = await user.$get("invitedBy");
          if (
            inviter?.subscribedToEventType(
              NotificationEventType.InviteAccepted
            )
          ) {
            await new InviteAcceptedEmail({
              to: inviter.email,
              inviterId: inviter.id,
              invitedName: user.name,
              teamUrl: user.team.url,
            }).schedule();
          }
        }
      }

      await signIn(ctx, "local-auth", {
        user,
        team: user.team,
        isNewTeam: false,
        isNewUser: false,
        client,
      });
    } catch (err) {
      Logger.debug("authentication", err);
      ctx.redirect(`/?notice=auth-error&description=${encodeURIComponent(err.message)}`);
    }
  }
);

router.post(
  "local-auth.signup",
  rateLimiter(RateLimiterStrategy.FivePerMinute),
  validate(T.LocalAuthSignupSchema),
  async (ctx: APIContext<T.LocalAuthSignupReq>) => {
    const { email, username, password, client } = ctx.input.body;

    try {
      const team = await findTeam(ctx);
      if (!team?.localAuthEnabled) {
        ctx.redirect("/?notice=auth-error&description=Local%20auth%20is%20not%20enabled");
        return;
      }

      const existingUser = await User.findOne({
        where: {
          teamId: team.id,
          email: email.toLowerCase(),
        },
      });

      if (existingUser) {
        if (!existingUser.hasPassword) {
          // Existing user without password (e.g. invited) can set one
          await existingUser.setPassword(password);
          if (username && !existingUser.name) {
            existingUser.name = username;
            await existingUser.save();
          }

          const teamWithScope = await Team.scope(
            "withAuthenticationProviders"
          ).findByPk(team.id, { rejectOnEmpty: true });

          await signIn(ctx, "local-auth", {
            user: existingUser,
            team: teamWithScope,
            isNewTeam: false,
            isNewUser: false,
            client,
          });
          return;
        }

        ctx.redirect("/?notice=auth-error&description=A%20user%20with%20this%20email%20already%20exists");
        return;
      }

      if (team.inviteRequired) {
        ctx.redirect("/?notice=auth-error&description=An%20invitation%20is%20required%20to%20join%20this%20workspace");
        return;
      }

      const passwordHash = User.hashPassword(password);

      const user = await User.create({
        teamId: team.id,
        name: username,
        email: email.toLowerCase(),
        passwordHash,
      });

      const createdUser = await User.scope("withTeam").findByPk(user.id, {
        rejectOnEmpty: true,
      });

      await signIn(ctx, "local-auth", {
        user: createdUser,
        team: createdUser.team,
        isNewTeam: false,
        isNewUser: true,
        client,
      });
    } catch (err) {
      Logger.debug("authentication", err);
      ctx.redirect(`/?notice=auth-error&description=${encodeURIComponent(err.message)}`);
    }
  }
);

export default router;
