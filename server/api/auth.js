// @flow
import Router from "koa-router";
import auth from "../middlewares/authentication";
import { presentUser, presentTeam, presentPolicies } from "../presenters";
import { Team } from "../models";
import { signin } from "../../shared/utils/routeHelpers";

const router = new Router();

let services = [];

if (process.env.GOOGLE_CLIENT_ID) {
  services.push({
    id: "google",
    name: "Google",
    authUrl: signin("google"),
  });
}

if (process.env.SLACK_KEY) {
  services.push({
    id: "slack",
    name: "Slack",
    authUrl: signin("slack"),
  });
}

router.post("auth.config", async ctx => {
  // If self hosted and there is only one team then that team becomes the
  // brand for the knowledge base and it's guest signin option is used for the
  // root login page
  if (process.env.DEPLOYMENT !== "hosted") {
    const teams = await Team.findAll();

    if (teams.length === 1) {
      const team = teams[0];
      const name = team.name;
      const logoUrl = team.avatarUrl;

      const email = team.guestSignin
        ? [
            {
              id: "email",
              name: "Email",
              authUrl: "",
            },
          ]
        : [];

      ctx.body = {
        data: {
          name,
          logoUrl,
          services: [...services, ...email],
        },
      };
      return;
    }
  }

  // TODO: Return config for subdomain

  ctx.body = {
    data: {
      services,
    },
  };
});

router.post("auth.info", auth(), async ctx => {
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);

  ctx.body = {
    data: {
      user: presentUser(user, { includeDetails: true }),
      team: presentTeam(team),
    },
    policies: presentPolicies(user, [team]),
  };
});

export default router;
