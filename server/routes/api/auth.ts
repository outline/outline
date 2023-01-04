import Router from "koa-router";
import { find, uniqBy } from "lodash";
import { TeamPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import { Event, Team } from "@server/models";
import {
  presentUser,
  presentTeam,
  presentPolicies,
  presentAvailableTeam,
} from "@server/presenters";
import ValidateSSOAccessTask from "@server/queues/tasks/ValidateSSOAccessTask";
import { APIContext } from "@server/types";
import { getSessionsInCookie } from "@server/utils/authentication";
import providers from "../auth/providers";

const router = new Router();

function filterProviders(team?: Team) {
  return providers
    .sort((provider) => (provider.id === "email" ? 1 : -1))
    .filter((provider) => {
      // guest sign-in is an exception as it does not have an authentication
      // provider using passport, instead it exists as a boolean option on the team
      if (provider.id === "email") {
        return team?.emailSigninEnabled;
      }

      return (
        !team ||
        env.DEPLOYMENT !== "hosted" ||
        find(team.authenticationProviders, {
          name: provider.id,
          enabled: true,
        })
      );
    })
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      authUrl: provider.authUrl,
    }));
}

router.post("auth.config", async (ctx: APIContext) => {
  // If self hosted AND there is only one team then that team becomes the
  // brand for the knowledge base and it's guest signin option is used for the
  // root login page.
  if (env.DEPLOYMENT !== "hosted") {
    const team = await Team.scope("withAuthenticationProviders").findOne();

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          providers: filterProviders(team),
        },
      };
      return;
    }
  }

  const domain = parseDomain(ctx.request.hostname);

  if (domain.custom) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: {
        domain: ctx.request.hostname,
      },
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          hostname: ctx.request.hostname,
          providers: filterProviders(team),
        },
      };
      return;
    }
  }

  // If subdomain signin page then we return minimal team details to allow
  // for a custom screen showing only relevant signin options for that team.
  else if (env.SUBDOMAINS_ENABLED && domain.teamSubdomain) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: {
        subdomain: domain.teamSubdomain,
      },
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          hostname: ctx.request.hostname,
          providers: filterProviders(team),
        },
      };
      return;
    }
  }

  // Otherwise, we're requesting from the standard root signin page
  ctx.body = {
    data: {
      providers: filterProviders(),
    },
  };
});

router.post("auth.info", auth(), async (ctx: APIContext) => {
  const { user } = ctx.state.auth;
  const sessions = getSessionsInCookie(ctx);
  const signedInTeamIds = Object.keys(sessions);

  const [team, signedInTeams, availableTeams] = await Promise.all([
    Team.scope("withDomains").findByPk(user.teamId, {
      rejectOnEmpty: true,
    }),
    Team.findAll({
      where: {
        id: signedInTeamIds,
      },
    }),
    user.availableTeams(),
  ]);

  await ValidateSSOAccessTask.schedule({ userId: user.id });

  ctx.body = {
    data: {
      user: presentUser(user, {
        includeDetails: true,
      }),
      team: presentTeam(team),
      availableTeams: uniqBy(
        [...signedInTeams, ...availableTeams],
        "id"
      ).map((team) =>
        presentAvailableTeam(
          team,
          signedInTeamIds.includes(team.id) || team.id === user.teamId
        )
      ),
    },
    policies: presentPolicies(user, [team]),
  };
});

router.post("auth.delete", auth(), transaction(), async (ctx: APIContext) => {
  const { auth, transaction } = ctx.state;
  const { user } = auth;

  await user.rotateJwtSecret({ transaction });
  await Event.create(
    {
      name: "users.signout",
      actorId: user.id,
      userId: user.id,
      teamId: user.teamId,
      data: {
        name: user.name,
      },
      ip: ctx.request.ip,
    },
    {
      transaction,
    }
  );

  ctx.body = {
    success: true,
  };
});

export default router;
