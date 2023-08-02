import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { AuthenticationProvider, Event } from "@server/models";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import { authorize } from "@server/policies";
import {
  presentAuthenticationProvider,
  presentPolicies,
} from "@server/presenters";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

router.post(
  "authenticationProviders.info",
  auth({ admin: true }),
  validate(T.AuthenticationProvidersInfoSchema),
  async (ctx: APIContext<T.AuthenticationProvidersInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const authenticationProvider = await AuthenticationProvider.findByPk(id);
    authorize(user, "read", authenticationProvider);

    ctx.body = {
      data: presentAuthenticationProvider(authenticationProvider),
      policies: presentPolicies(user, [authenticationProvider]),
    };
  }
);

router.post(
  "authenticationProviders.update",
  auth({ admin: true }),
  validate(T.AuthenticationProvidersUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.AuthenticationProvidersUpdateReq>) => {
    const { transaction } = ctx.state;
    const { id, isEnabled } = ctx.input.body;
    const { user } = ctx.state.auth;

    const authenticationProvider = await AuthenticationProvider.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    authorize(user, "update", authenticationProvider);
    const enabled = !!isEnabled;

    if (enabled) {
      await authenticationProvider.enable({ transaction });
    } else {
      await authenticationProvider.disable({ transaction });
    }

    await Event.create(
      {
        name: "authenticationProviders.update",
        data: {
          enabled,
        },
        modelId: id,
        teamId: user.teamId,
        actorId: user.id,
        ip: ctx.request.ip,
      },
      { transaction }
    );

    ctx.body = {
      data: presentAuthenticationProvider(authenticationProvider),
      policies: presentPolicies(user, [authenticationProvider]),
    };
  }
);

router.post(
  "authenticationProviders.list",
  auth({ admin: true }),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    authorize(user, "read", user.team);

    const teamAuthenticationProviders = (await user.team.$get(
      "authenticationProviders"
    )) as AuthenticationProvider[];

    const data = AuthenticationHelper.providers
      .filter((p) => p.id !== "email")
      .map((p) => {
        const row = teamAuthenticationProviders.find((t) => t.name === p.id);

        return {
          id: p.id,
          name: p.id,
          displayName: p.name,
          isEnabled: false,
          isConnected: false,
          ...(row ? presentAuthenticationProvider(row) : {}),
        };
      })
      .sort((a) => (a.isEnabled ? -1 : 1));

    ctx.body = {
      data,
    };
  }
);

export default router;
