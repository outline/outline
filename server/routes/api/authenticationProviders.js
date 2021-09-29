// @flow
import Router from "koa-router";
import auth from "../../middlewares/authentication";
import { AuthenticationProvider, Event } from "../../models";
import policy from "../../policies";
import {
  presentAuthenticationProvider,
  presentPolicies,
} from "../../presenters";
import allAuthenticationProviders from "../auth/providers";

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

router.post("authenticationProviders.update", auth(), async (ctx) => {
  const { id, isEnabled } = ctx.body;
  ctx.assertUuid(id, "id is required");
  ctx.assertPresent(isEnabled, "isEnabled is required");

  const user = ctx.state.user;
  const authenticationProvider = await AuthenticationProvider.findByPk(id);
  authorize(user, "update", authenticationProvider);

  const enabled = !!isEnabled;
  if (enabled) {
    await authenticationProvider.enable();
  } else {
    await authenticationProvider.disable();
  }

  await Event.create({
    name: "authenticationProviders.update",
    data: { enabled },
    modelId: id,
    teamId: user.teamId,
    actorId: user.id,
    ip: ctx.request.ip,
  });

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
      // email auth is dealt with separetly right now, although it definitely
      // wants to be here in the future – we'll need to migrate more data though
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
