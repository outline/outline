// @flow
import Router from "koa-router";
import auth from "../middlewares/authentication";
import { Team } from "../models";

import policy from "../policies";
import { presentTeam, presentPolicies } from "../presenters";

const { authorize } = policy;
const router = new Router();

router.post("team.update", auth(), async (ctx) => {
  const {
    name,
    language,
    avatarUrl,
    subdomain,
    sharing,
    guestSignin,
    documentEmbeds,
  } = ctx.body;
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);
  authorize(user, "update", team);

  if (subdomain !== undefined && process.env.SUBDOMAINS_ENABLED === "true") {
    team.subdomain = subdomain === "" ? null : subdomain;
  }

  if (name) team.name = name;
  if (language) team.language = language;
  if (sharing !== undefined) team.sharing = sharing;
  if (documentEmbeds !== undefined) team.documentEmbeds = documentEmbeds;
  if (guestSignin !== undefined) team.guestSignin = guestSignin;
  if (avatarUrl !== undefined) team.avatarUrl = avatarUrl;
  await team.save();

  ctx.body = {
    data: presentTeam(team),
    policies: presentPolicies(user, [team]),
  };
});

export default router;
