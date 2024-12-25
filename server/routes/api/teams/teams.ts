import Router from "koa-router";
import { UserRole } from "@shared/types";
import teamCreator from "@server/commands/teamCreator";
import teamDestroyer from "@server/commands/teamDestroyer";
import teamUpdater from "@server/commands/teamUpdater";
import ConfirmTeamDeleteEmail from "@server/emails/templates/ConfirmTeamDeleteEmail";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Event, Team, TeamDomain, User } from "@server/models";
import { authorize } from "@server/policies";
import { presentTeam, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { safeEqual } from "@server/utils/crypto";
import * as T from "./schema";

const router = new Router();
const emailEnabled = !!(env.SMTP_HOST || env.isDevelopment);

const handleTeamUpdate = async (ctx: APIContext<T.TeamsUpdateSchemaReq>) => {
  const { transaction } = ctx.state;
  const { user } = ctx.state.auth;
  const team = await Team.findByPk(user.teamId, {
    include: [{ model: TeamDomain, separate: true }],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  authorize(user, "update", team);

  const updatedTeam = await teamUpdater({
    params: ctx.input.body,
    user,
    team,
    ip: ctx.request.ip,
    transaction,
  });

  ctx.body = {
    data: presentTeam(updatedTeam),
    policies: presentPolicies(user, [updatedTeam]),
  };
};

router.post(
  "team.update",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.TeamsUpdateSchema),
  transaction(),
  handleTeamUpdate
);

router.post(
  "teams.update",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.TeamsUpdateSchema),
  transaction(),
  handleTeamUpdate
);

router.post(
  "teams.requestDelete",
  rateLimiter(RateLimiterStrategy.FivePerHour),
  auth(),
  async (ctx: APIContext) => {
    if (!emailEnabled) {
      throw ValidationError("Email support is not setup for this instance");
    }

    const { user } = ctx.state.auth;
    const { team } = user;
    authorize(user, "delete", team);

    await new ConfirmTeamDeleteEmail({
      to: user.email,
      deleteConfirmationCode: team.getDeleteConfirmationCode(user),
    }).schedule();

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "teams.delete",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  validate(T.TeamsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.TeamsDeleteSchemaReq>) => {
    const { auth, transaction } = ctx.state;
    const { code } = ctx.input.body;
    const { user } = auth;
    const { team } = user;

    authorize(user, "delete", team);

    if (emailEnabled) {
      const deleteConfirmationCode = team.getDeleteConfirmationCode(user);

      if (!safeEqual(code, deleteConfirmationCode)) {
        throw ValidationError("The confirmation code was incorrect");
      }
    }

    await teamDestroyer({
      team,
      user,
      transaction,
      ip: ctx.request.ip,
    });

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "teams.create",
  rateLimiter(RateLimiterStrategy.FivePerHour),
  auth(),
  transaction(),
  async (ctx: APIContext) => {
    const { transaction } = ctx.state;
    const { user } = ctx.state.auth;
    const { name } = ctx.request.body;

    const existingTeam = await Team.scope(
      "withAuthenticationProviders"
    ).findByPk(user.teamId, {
      rejectOnEmpty: true,
      transaction,
    });

    authorize(user, "createTeam", existingTeam);

    const authenticationProviders = existingTeam.authenticationProviders.map(
      (provider) => ({
        name: provider.name,
        providerId: provider.providerId,
      })
    );

    const team = await teamCreator({
      name,
      subdomain: name,
      authenticationProviders,
      ip: ctx.ip,
      transaction,
    });

    const newUser = await User.create(
      {
        teamId: team.id,
        name: user.name,
        email: user.email,
        role: UserRole.Admin,
      },
      { transaction }
    );

    await Event.create(
      {
        name: "users.create",
        actorId: user.id,
        userId: newUser.id,
        teamId: newUser.teamId,
        data: {
          name: newUser.name,
        },
        ip: ctx.ip,
      },
      { transaction }
    );

    ctx.body = {
      success: true,
      data: {
        team: presentTeam(team),
        transferUrl: `${
          team.url
        }/auth/redirect?token=${newUser?.getTransferToken()}`,
      },
    };
  }
);

export default router;
