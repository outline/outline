// @flow
import Router from "koa-router";
import allAuthenticationProviders from "../auth/providers";
import auth from "../middlewares/authentication";
import { AuthenticationProvider } from "../models";
import policy from "../policies";
import { presentAuthenticationProvider, presentPolicies } from "../presenters";

const router = new Router();
const { authorize } = policy;

router.post("authenticationProviders.info", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertUuid(id, "id is required");

  const user = ctx.state.user;
  const authenticationProvider = await AuthenticationProvider.findByPk(id);
  authorize(user, "read", authenticationProvider);

  ctx.body = {
    data: presentAuthenticationProvider(authenticationProvider),
    policies: presentPolicies(user, [authenticationProvider]),
  };
});

router.post("authenticationProviders.list", auth(), async (ctx) => {
  const user = ctx.state.user;
  authorize(user, "read", user.team);

  const teamAuthenticationProviders = await user.team.getAuthenticationProviders();
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
  };
});

export default router;
