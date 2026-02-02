import Router from "koa-router";
import { Client, TeamPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import { AuthorizationError } from "@server/errors";
import ResetPasswordEmail from "@server/emails/templates/ResetPasswordEmail";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { Team, User } from "@server/models";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { signIn } from "@server/utils/authentication";
import { getUserForPasswordResetToken } from "@server/utils/jwt";
import * as T from "./schema";

const router = new Router();

async function findTeamForRequest(ctx: APIContext, requirePasswordSignin = true) {
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

  if (requirePasswordSignin && team) {
    if (!team.getPreference(TeamPreference.PasswordSigninEnabled)) {
      return null;
    }
  }

  return team ?? null;
}

router.post(
  "password",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.PasswordSchema),
  async (ctx: APIContext<T.PasswordReq>) => {
    const { email, password, client } = ctx.input.body;
    const team = await findTeamForRequest(ctx);

    if (!team) {
      throw AuthorizationError();
    }

    const user = await User.scope("withTeam").findOne({
      where: {
        teamId: team.id,
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      return ctx.redirect("/?notice=auth-error&description=Invalid%20credentials");
    }

    const authentications = await user.$get("authentications");
    if (authentications.length > 0) {
      return ctx.redirect(
        "/?notice=auth-error&description=Password%20login%20is%20disabled"
      );
    }
    if (!user.invitedById) {
      return ctx.redirect(
        "/?notice=auth-error&description=Password%20login%20is%20disabled"
      );
    }

    const valid = await user.verifyPassword(password);
    if (!valid) {
      return ctx.redirect("/?notice=auth-error&description=Invalid%20credentials");
    }

    if (user.isSuspended) {
      return ctx.redirect("/?notice=user-suspended");
    }

    await signIn(ctx, "password", {
      user,
      team: user.team,
      isNewTeam: false,
      isNewUser: false,
      client,
    });
  }
);

router.post(
  "password.reset.request",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.PasswordResetRequestSchema),
  async (ctx: APIContext<T.PasswordResetRequestReq>) => {
    if (!env.EMAIL_ENABLED) {
      throw AuthorizationError();
    }

    const { email } = ctx.input.body;
    const team = await findTeamForRequest(ctx);

    if (!team) {
      ctx.body = { success: true };
      return;
    }

    const user = await User.scope("withTeam").findOne({
      where: {
        teamId: team.id,
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      ctx.body = { success: true };
      return;
    }

    const authentications = await user.$get("authentications");
    if (authentications.length > 0 || !user.invitedById || user.isSuspended) {
      ctx.body = { success: true };
      return;
    }

    const token = user.getPasswordResetToken();
    await new ResetPasswordEmail({
      to: user.email,
      token,
      teamName: team.name,
      teamUrl: team.url,
    }).schedule();

    ctx.body = { success: true };
  }
);

router.post(
  "password.reset.confirm",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.PasswordResetConfirmSchema),
  async (ctx: APIContext<T.PasswordResetConfirmReq>) => {
    const { token, password, client } = ctx.input.body;

    let user: User;

    try {
      user = await getUserForPasswordResetToken(token);
    } catch (err) {
      ctx.redirect(
        `/?notice=auth-error&description=${encodeURIComponent(err.message)}`
      );
      return;
    }

    const team = user.team;

    if (!team?.getPreference(TeamPreference.PasswordSigninEnabled)) {
      ctx.redirect(
        "/?notice=auth-error&description=Password%20login%20is%20disabled"
      );
      return;
    }

    const authentications = await user.$get("authentications");
    if (authentications.length > 0 || !user.invitedById) {
      ctx.redirect(
        "/?notice=auth-error&description=Password%20login%20is%20disabled"
      );
      return;
    }

    if (user.isSuspended) {
      ctx.redirect("/?notice=user-suspended");
      return;
    }

    await user.setPassword(password);
    await user.save({
      hooks: false,
      fields: ["passwordHash"],
    });

    await signIn(ctx, "password", {
      user,
      team,
      client,
      isNewTeam: false,
      isNewUser: false,
    });
  }
);

export default router;
