// @flow
import Router from "koa-router";
import { authorize } from "passport";
import allAuthenticationProviders from "../auth/providers";
import auth from "../middlewares/authentication";
import { Team } from "../models";
import { presentAuthenticationProvider, presentPolicies } from "../presenters";

const router = new Router();

router.post("authProviders.list", auth(), async (ctx) => {
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);
  authorize(user, "update", team);

  const teamAuthenticationProviders = await team.getAuthenticationProviders();
  const otherAuthenticationProviders = allAuthenticationProviders.filter(
    (p) => !teamAuthenticationProviders.find({ name: p.id }) && p.enabled
  );

  ctx.body = {
    data: {
      authenticationProviders: [
        ...teamAuthenticationProviders.map(presentAuthenticationProvider),
        ...otherAuthenticationProviders.map((p) => ({
          name: p.name,
          isEanbled: false,
          isConnected: false,
        })),
      ],
    },
    //policies: presentPolicies(user, [team]),
  };
});

export default router;
