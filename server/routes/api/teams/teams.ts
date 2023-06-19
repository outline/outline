import invariant from "invariant";
import Router from "koa-router";
import teamCreator from "@server/commands/teamCreator";
import teamUpdater from "@server/commands/teamUpdater";
import { sequelize } from "@server/database/sequelize";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { Event, Team, TeamDomain, User } from "@server/models";
import { authorize } from "@server/policies";
import { presentTeam, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";

const router = new Router();

router.post(
  "team.update",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  validate(T.TeamsUpdateSchema),
  async (ctx: APIContext<T.TeamsUpdateSchemaReq>) => {
    const { user } = ctx.state.auth;
    const team = await Team.findByPk(user.teamId, {
      include: [{ model: TeamDomain }],
    });
    authorize(user, "update", team);

    const updatedTeam = await teamUpdater({
      params: ctx.input.body,
      user,
      team,
      ip: ctx.request.ip,
    });

    ctx.body = {
      data: presentTeam(updatedTeam),
      policies: presentPolicies(user, [updatedTeam]),
    };
  }
);

router.post(
  "teams.create",
  rateLimiter(RateLimiterStrategy.FivePerHour),
  auth(),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    const { name } = ctx.request.body;

    const existingTeam = await Team.scope(
      "withAuthenticationProviders"
    ).findByPk(user.teamId, {
      rejectOnEmpty: true,
    });

    authorize(user, "createTeam", existingTeam);

    const authenticationProviders = existingTeam.authenticationProviders.map(
      (provider) => ({
        name: provider.name,
        providerId: provider.providerId,
      })
    );

    invariant(
      authenticationProviders?.length,
      "Team must have at least one authentication provider"
    );

    const [team, newUser] = await sequelize.transaction(async (transaction) => {
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
          isAdmin: true,
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

      return [team, newUser];
    });

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
