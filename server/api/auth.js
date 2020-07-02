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
  // TODO: Check if SELF HOSTED
  // Return results based on first team
  // return guest signin based on subdomain

  ctx.body = {
    data: { services },
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
