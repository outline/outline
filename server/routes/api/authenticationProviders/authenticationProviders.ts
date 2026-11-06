import Router from "@koa/router";
import { UserRole } from "@shared/types";
import env from "@server/env";
import { InvalidRequestError, ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { AuthenticationProvider } from "@server/models";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import { authorize, can } from "@server/policies";
import { PluginManager } from "@server/utils/PluginManager";
import {
  presentAuthenticationProvider,
  presentPolicies,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

/** Providers that are not connected through an identity provider. */
const NON_SSO_PROVIDERS = ["email", "passkeys"];

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
  "authenticationProviders.create",
  auth({ role: UserRole.Admin }),
  validate(T.AuthenticationProvidersCreateSchema),
  transaction(),
  async (ctx: APIContext<T.AuthenticationProvidersCreateReq>) => {
    const { transaction } = ctx.state;
    const { name, config } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "configureAuthenticationProvider", user.team);

    const configure = getConfigure(name);
    const resolved = await configure(config);
    await assertProviderIdAvailable(user.teamId, resolved.providerId);

    // Providers stay disabled until an admin has signed in with them once.
    const authenticationProvider = await AuthenticationProvider.createWithCtx(
      ctx,
      {
        name,
        teamId: user.teamId,
        providerId: resolved.providerId,
        config: resolved.config,
        enabled: false,
      },
      undefined,
      { transaction }
    );

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
    const { id, isEnabled, settings, config } = ctx.input.body;
    const { user } = ctx.state.auth;

    const authenticationProvider = await AuthenticationProvider.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    authorize(user, "update", authenticationProvider);

    if (
      settings?.groupSyncEnabled === true &&
      !authenticationProvider.settings?.groupSyncEnabled
    ) {
      authorize(user, "externalGroupSync", user.team);

      const groupSyncProvider = PluginManager.getGroupSyncProvider(
        authenticationProvider.name
      );
      if (!groupSyncProvider) {
        throw InvalidRequestError(
          "Group sync is not available for this provider"
        );
      }
      if (groupSyncProvider.startGroupSync) {
        throw InvalidRequestError("Set up group sync with admin consent");
      }
    }

    if (config) {
      authorize(user, "configureAuthenticationProvider", user.team);

      const configure = getConfigure(authenticationProvider.name);
      const resolved = await configure(config, authenticationProvider.config);
      await assertProviderIdAvailable(
        user.teamId,
        resolved.providerId,
        authenticationProvider.id
      );
      await authenticationProvider.updateWithCtx(ctx, {
        providerId: resolved.providerId,
        config: resolved.config,
      });
    }

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
          ...authenticationProvider.settings,
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
  "authenticationProviders.startGroupSync",
  auth({ role: UserRole.Admin }),
  validate(T.AuthenticationProvidersStartGroupSyncSchema),
  async (ctx: APIContext<T.AuthenticationProvidersStartGroupSyncReq>) => {
    const { user } = ctx.state.auth;
    const authenticationProvider = await AuthenticationProvider.findByPk(
      ctx.input.body.id
    );
    authorize(user, "update", authenticationProvider);
    authorize(user, "externalGroupSync", user.team);

    const groupSyncProvider = PluginManager.getGroupSyncProvider(
      authenticationProvider.name
    );
    if (!authenticationProvider.enabled || !authenticationProvider.providerId) {
      throw InvalidRequestError(
        "Authentication provider must be connected first"
      );
    }
    if (!groupSyncProvider?.startGroupSync) {
      throw InvalidRequestError(
        "Group sync setup is not available for this provider"
      );
    }

    ctx.body = {
      data: {
        url: await groupSyncProvider.startGroupSync(
          authenticationProvider,
          user
        ),
      },
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

    // On self-hosted, providers are typically registered via env vars and
    // would re-appear on the login screen if the row was destroyed, so we
    // keep the row with enabled=false. On cloud, destroy the row so the
    // admin can reconnect with a different workspace. Providers configured
    // by an admin only exist in the database, so are always destroyed.
    if (env.isCloudHosted || authenticationProvider.config) {
      await authenticationProvider.destroy({ transaction });
    }

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
      "authenticationProviders",
      { order: [["createdAt", "ASC"]] }
    )) as AuthenticationProvider[];

    const plugins = AuthenticationHelper.providers.filter(
      (p) => !NON_SSO_PROVIDERS.includes(p.value.id)
    );

    const data: Record<string, unknown>[] = teamAuthenticationProviders
      .filter((row) => plugins.some((p) => p.value.id === row.name))
      .map(presentAuthenticationProvider);

    // On self-hosted, providers registered via env vars can be used to sign in
    // before they are connected, so they are listed as well.
    if (!env.isCloudHosted) {
      for (const p of plugins) {
        if (
          p.value.configure ||
          teamAuthenticationProviders.some((row) => row.name === p.value.id)
        ) {
          continue;
        }

        const groupSyncProvider = PluginManager.getGroupSyncProvider(
          p.value.id
        );
        data.push({
          id: p.value.id,
          name: p.value.id,
          displayName: p.name,
          isEnabled: false,
          isConnected: false,
          groupSyncSupported: !!groupSyncProvider,
          groupSyncUsesClaim: groupSyncProvider?.useGroupClaim ?? false,
          groupSyncRequiresSetup: !!groupSyncProvider?.startGroupSync,
        });
      }
    }

    ctx.body = {
      data,
    };
  }
);

router.post(
  "authenticationProviders.available",
  auth({ role: UserRole.Admin }),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    authorize(user, "createAuthenticationProvider", user.team);
    const canConfigure = can(
      user,
      "configureAuthenticationProvider",
      user.team
    );

    ctx.body = {
      data: AuthenticationHelper.providers
        .filter(
          (p) =>
            !NON_SSO_PROVIDERS.includes(p.value.id) &&
            (!p.value.configure || canConfigure)
        )
        .map((p) => ({
          id: p.value.id,
          name: p.name ?? p.value.id,
          isConfigurable: !!p.value.configure,
          callbackUrl: p.value.callbackUrl?.(),
        })),
    };
  }
);

/**
 * Returns the function that resolves configuration for a provider type.
 *
 * @param name the name of the provider type.
 * @returns the configure function.
 * @throws {ValidationError} if the provider type cannot be configured.
 */
function getConfigure(name: string) {
  const configure = AuthenticationHelper.providers.find(
    (p) => p.value.id === name
  )?.value.configure;

  if (!configure) {
    throw ValidationError("This authentication provider cannot be configured");
  }
  return configure;
}

/**
 * Ensures that no other provider of the team uses the given identifier.
 *
 * @param teamId the id of the team.
 * @param providerId the external identifier of the provider.
 * @param excludeId the id of a provider to ignore, when updating.
 * @throws {ValidationError} if the identifier is already in use.
 */
async function assertProviderIdAvailable(
  teamId: string,
  providerId: string,
  excludeId?: string
) {
  const existing = await AuthenticationProvider.findOne({
    where: { teamId, providerId },
  });

  if (existing && existing.id !== excludeId) {
    throw ValidationError(
      "An authentication provider with this issuer is already connected"
    );
  }
}

export default router;
