import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { AuthenticationProvider, Event } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentAuthenticationProvider,
  presentPolicies,
} from "@server/presenters";
import { assertUuid, assertPresent } from "@server/validation";
import allAuthenticationProviders from "../auth/providers";

const router = new Router();

router.post("authenticationProviders.info", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");
  const { user } = ctx.state;
  const authenticationProvider = await AuthenticationProvider.findByPk(id);
  authorize(user, "read", authenticationProvider);

  ctx.body = {
    data: presentAuthenticationProvider(authenticationProvider),
    policies: presentPolicies(user, [authenticationProvider]),
  };
});

router.post("authenticationProviders.update", auth(), async (ctx) => {
  const { id, isEnabled } = ctx.body;
  assertUuid(id, "id is required");
  assertPresent(isEnabled, "isEnabled is required");
  const { user } = ctx.state;
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
    data: {
      enabled,
    },
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
  const { user } = ctx.state;
  authorize(user, "read", user.team);

  const teamAuthenticationProviders = await user.team.$get(
    "authenticationProviders"
  );

  const otherAuthenticationProviders = allAuthenticationProviders.filter(
    (p) =>
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 't' implicitly has an 'any' type.
      !teamAuthenticationProviders.find((t) => t.name === p.id) &&
      p.enabled && // email auth is dealt with separetly right now, although it definitely
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
