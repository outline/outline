// @flow
import Router from "koa-router";
import allAuthenticationProviders from "../auth/providers";
import auth from "../middlewares/authentication";
import { Team } from "../models";
import policy from "../policies";
import { presentAuthenticationProvider } from "../presenters";

const router = new Router();
const { authorize } = policy;

router.post("authenticationProviders.list", auth(), async (ctx) => {
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);
  authorize(user, "read", team);

  const teamAuthenticationProviders = await team.getAuthenticationProviders();
  const otherAuthenticationProviders = allAuthenticationProviders.filter(
    (p) =>
      !teamAuthenticationProviders.find((t) => t.name === p.id) &&
      p.enabled &&
      p.id !== "email"
  );

  ctx.body = {
    data: {
      authenticationProviders: [
        ...teamAuthenticationProviders.map(presentAuthenticationProvider),
        ...otherAuthenticationProviders.map((p) => ({
          name: p.id,
          isEnabled: false,
          isConnected: false,
        })),
      ],
    },
    //policies: presentPolicies(user, [team]),
  };
});

export default router;
