// @flow
import Router from "koa-router";
import { find } from "lodash";
import { parseDomain, isCustomSubdomain } from "../../shared/utils/domains";
import providers from "../auth/providers";
import { AuthenticationError } from "../errors";
import auth from "../middlewares/authentication";
import { AuthenticationProvider, Team, UserAuthentication } from "../models";
import { presentUser, presentTeam, presentPolicies } from "../presenters";
import * as Slack from "../slack";
import { isCustomDomain } from "../utils/domains";

const router = new Router();

function filterProviders(team) {
  return providers
    .sort((provider) => (provider.id === "email" ? 1 : -1))
    .filter((provider) => {
      // guest sign-in is an exception as it does not have an authentication
      // provider using passport, instead it exists as a boolean option on the team
      if (provider.id === "email") {
        return team && team.guestSignin;
      }

      return (
        !team ||
        find(team.authenticationProviders, { name: provider.id, enabled: true })
      );
    })
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      authUrl: provider.authUrl,
    }));
}

router.post("auth.config", async (ctx) => {
  // If self hosted AND there is only one team then that team becomes the
  // brand for the knowledge base and it's guest signin option is used for the
  // root login page.
  if (process.env.DEPLOYMENT !== "hosted") {
    const teams = await Team.scope("withAuthenticationProviders").findAll();

    if (teams.length === 1) {
      const team = teams[0];
      ctx.body = {
        data: {
          name: team.name,
          providers: filterProviders(team),
        },
      };
      return;
    }
  }

  if (isCustomDomain(ctx.request.hostname)) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: { domain: ctx.request.hostname },
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          hostname: ctx.request.hostname,
          providers: filterProviders(team),
        },
      };
      return;
    }
  }

  // If subdomain signin page then we return minimal team details to allow
  // for a custom screen showing only relevant signin options for that team.
  if (
    process.env.SUBDOMAINS_ENABLED === "true" &&
    isCustomSubdomain(ctx.request.hostname) &&
    !isCustomDomain(ctx.request.hostname)
  ) {
    const domain = parseDomain(ctx.request.hostname);
    const subdomain = domain ? domain.subdomain : undefined;
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: { subdomain },
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
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

router.post("auth.info", auth(), async (ctx) => {
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);

  const authenticationProvider = await AuthenticationProvider.findOne({
    where: {
      teamId: team.id,
    },
  });

  const userAuthentication = await UserAuthentication.findOne({
    where: {
      userId: user.id,
      authenticationProviderId: authenticationProvider.id,
    },
  });

  if (!userAuthentication.accessToken || !userAuthentication.refreshToken) {
    throw new AuthenticationError("Tokens are not provided");
  }

  if (authenticationProvider.name === "slack") {
    const data = await Slack.post("auth.test", {
      token: userAuthentication.accessToken,
    });

    if (!data.ok) {
      const data = await Slack.postUrlEncodedForm("oauth.v2.access", {
        client_id: process.env.SLACK_KEY,
        client_secret: process.env.SLACK_SECRET,
        grant_type: "refresh_token",
        refresh_token: userAuthentication.refreshToken,
      });

      if (!data.ok) {
        throw new AuthenticationError(data.error);
      }

      userAuthentication.accessToken = data.access_token;
      userAuthentication.refreshToken = data.refresh_token;
      await userAuthentication.save();
    }
  } else if (authenticationProvider.name === "google") {
  }

  ctx.body = {
    data: {
      user: presentUser(user, { includeDetails: true }),
      team: presentTeam(team),
    },
    policies: presentPolicies(user, [team]),
  };
});

export default router;
