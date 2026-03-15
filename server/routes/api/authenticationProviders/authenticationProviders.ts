import Router from "koa-router";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { AuthenticationProvider } from "@server/models";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import { authorize } from "@server/policies";
import { PluginManager } from "@server/utils/PluginManager";
import {
  presentAuthenticationProvider,
  presentPolicies,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

router.post(
  "authenticationProviders.info",
  auth({ role: UserRole.Admin }),
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
  auth({ role: UserRole.Admin }),
  validate(T.AuthenticationProvidersUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.AuthenticationProvidersUpdateReq>) => {
    const { transaction } = ctx.state;
    const { id, isEnabled, settings } = ctx.input.body;
    const { user } = ctx.state.auth;

    const authenticationProvider = await AuthenticationProvider.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    authorize(user, "update", authenticationProvider);

    if (isEnabled !== undefined) {
      const enabled = !!isEnabled;

      if (enabled) {
        await authenticationProvider.enable(ctx);
      } else {
        await authenticationProvider.disable(ctx);
      }
    }

    if (settings !== undefined) {
      await authenticationProvider.updateWithCtx(ctx, {
        settings: {
          ...(authenticationProvider.settings ?? {}),
          ...settings,
        },
      });
    }

    ctx.body = {
      data: presentAuthenticationProvider(authenticationProvider),
      policies: presentPolicies(user, [authenticationProvider]),
    };
  }
);

router.post(
  "authenticationProviders.delete",
  auth({ role: UserRole.Admin }),
  validate(T.AuthenticationProvidersDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.AuthenticationProvidersDeleteReq>) => {
    const { transaction } = ctx.state;
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const authenticationProvider = await AuthenticationProvider.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    authorize(user, "delete", authenticationProvider);

    if (authenticationProvider.enabled) {
      await authenticationProvider.disable(ctx);
    }

    await authenticationProvider.destroy({ transaction });

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "authenticationProviders.list",
  auth({ role: UserRole.Admin }),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    authorize(user, "read", user.team);

    const teamAuthenticationProviders = (await user.team.$get(
      "authenticationProviders"
    )) as AuthenticationProvider[];

    const data = AuthenticationHelper.providers
      .filter((p) => p.value.id !== "email" && p.value.id !== "passkeys")
      .map((p) => {
        const row = teamAuthenticationProviders.find(
          (t) => t.name === p.value.id
        );
        const groupSyncProvider = PluginManager.getGroupSyncProvider(
          p.value.id
        );

        return {
          id: p.value.id,
          name: p.value.id,
          displayName: p.name,
          isEnabled: false,
          isConnected: false,
          groupSyncSupported: !!groupSyncProvider,
          groupSyncUsesClaim: groupSyncProvider?.useGroupClaim ?? false,
          ...(row ? presentAuthenticationProvider(row) : {}),
        };
      })
      .sort((a, b) => (a.isEnabled === b.isEnabled ? 0 : a.isEnabled ? -1 : 1));

    ctx.body = {
      data,
    };
  }
);

export default router;
