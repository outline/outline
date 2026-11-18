import Router from "@koa/router";
import { Op } from "sequelize";
import { addSeconds } from "date-fns";
import { toError } from "@shared/utils/error";
import { IntegrationService, IntegrationType } from "@shared/types";
import { ValidationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration } from "@server/models";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";
import {
  generateOAuthStateNonce,
  verifyOAuthStateNonce,
} from "@server/utils/oauth";
import { validateUrlNotPrivate } from "@server/utils/url";
import { GiteaOAuthNonceCookie, GiteaUtils } from "../../shared/GiteaUtils";
import { Gitea } from "../gitea";
import * as T from "./schema";

const router = new Router();

router.post(
  "gitea.connect",
  auth(),
  validate(T.GiteaConnectSchema),
  transaction(),
  async (ctx: APIContext<T.GiteaConnectReq>) => {
    const { clientId, clientSecret } = ctx.input.body;
    const parsedUrl = new URL(ctx.input.body.url);
    const url = `${parsedUrl.origin}${parsedUrl.pathname}`.replace(/\/+$/, "");
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    authorize(user, "createIntegration", user.team);
    await validateUrlNotPrivate(url);

    // Remove this user's earlier connection attempts that were not completed.
    const staleAuths = await IntegrationAuthentication.findAll({
      attributes: ["id"],
      where: {
        service: IntegrationService.Gitea,
        userId: user.id,
        teamId: user.teamId,
        token: { [Op.is]: null } as never,
      },
      transaction,
    });

    if (staleAuths.length) {
      const staleIds = staleAuths.map((authentication) => authentication.id);
      await Integration.destroy({
        where: {
          service: IntegrationService.Gitea,
          teamId: user.teamId,
          authenticationId: staleIds,
        },
        force: true,
        transaction,
      });
      await IntegrationAuthentication.destroy({
        where: { id: staleIds },
        transaction,
      });
    }

    // The pending connection is separate from any connected integration for
    // the same URL, which keeps working until the callback succeeds.
    const pendingAuth = await IntegrationAuthentication.create(
      {
        service: IntegrationService.Gitea,
        userId: user.id,
        teamId: user.teamId,
        clientId,
        clientSecret,
      },
      { transaction }
    );

    await Integration.create(
      {
        service: IntegrationService.Gitea,
        type: IntegrationType.Embed,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: pendingAuth.id,
        settings: { gitea: { url } },
      } as Partial<Integration>,
      { transaction }
    );

    const nonce = generateOAuthStateNonce(ctx, GiteaOAuthNonceCookie);
    const redirectUrl = GiteaUtils.authUrl(
      { teamId: user.teamId, nonce },
      url,
      clientId
    );

    ctx.body = {
      data: { redirectUrl },
    };
  }
);

router.get(
  "gitea.callback",
  auth({ optional: true }),
  validate(T.GiteaCallbackSchema),
  apexAuthRedirect<T.GiteaCallbackReq>({
    getTeamId: (ctx) => GiteaUtils.parseState(ctx.input.query.state)?.teamId,
    getRedirectPath: (ctx, team) =>
      GiteaUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => GiteaUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.GiteaCallbackReq>) => {
    const { code, error, state } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    if (error) {
      ctx.redirect(GiteaUtils.errorUrl(error));
      return;
    }

    const parsedState = GiteaUtils.parseState(state);
    if (!parsedState) {
      throw ValidationError("Invalid state");
    }

    verifyOAuthStateNonce(ctx, GiteaOAuthNonceCookie, parsedState.nonce);
    authorize(user, "createIntegration", user.team);

    try {
      const pendingAuth = await IntegrationAuthentication.findOne({
        where: {
          service: IntegrationService.Gitea,
          userId: user.id,
          teamId: user.teamId,
          token: { [Op.is]: null } as never,
        },
        transaction,
      });

      const pendingIntegration = pendingAuth
        ? await Integration.findOne({
            where: {
              service: IntegrationService.Gitea,
              teamId: user.teamId,
              authenticationId: pendingAuth.id,
            },
            transaction,
          })
        : null;

      const baseUrl = (
        pendingIntegration?.settings as { gitea?: { url?: string } } | undefined
      )?.gitea?.url;

      if (
        !code ||
        !pendingAuth?.clientId ||
        !pendingAuth.clientSecret ||
        !pendingIntegration ||
        !baseUrl
      ) {
        ctx.redirect(GiteaUtils.errorUrl("unauthenticated"));
        return;
      }

      const oauth = await Gitea.oauthAccess({
        code,
        baseUrl,
        clientId: pendingAuth.clientId,
        clientSecret: pendingAuth.clientSecret,
      });

      const userInfo = await Gitea.getCurrentUser({
        baseUrl,
        accessToken: oauth.access_token,
      });

      await pendingAuth.update(
        {
          token: oauth.access_token,
          refreshToken: oauth.refresh_token,
          expiresAt: addSeconds(Date.now(), oauth.expires_in),
          scopes: GiteaUtils.scopes,
        },
        { transaction }
      );

      // When reconnecting, move the new authentication to the connected
      // integration that already exists for this URL.
      const existing = await Integration.findOne({
        where: {
          service: IntegrationService.Gitea,
          teamId: user.teamId,
          "settings.gitea.url": baseUrl,
          "settings.gitea.installation.id": { [Op.ne]: null },
        },
        transaction,
      });

      const integration = existing ?? pendingIntegration;
      const previousAuthenticationId = existing?.authenticationId;

      if (existing) {
        await Integration.destroy({
          where: { id: pendingIntegration.id },
          force: true,
          transaction,
        });
      }

      integration.authenticationId = pendingAuth.id;
      integration.settings = {
        gitea: {
          url: baseUrl,
          installation: {
            id: userInfo.id,
            account: {
              id: userInfo.id,
              name: userInfo.login,
              avatarUrl: userInfo.avatar_url,
            },
          },
        },
      } as Integration["settings"];

      // The integration is only usable once authorized, so publish the
      // create event now.
      await integration.saveWithCtx(ctx, undefined, { name: "create" });

      if (previousAuthenticationId) {
        await IntegrationAuthentication.destroy({
          where: { id: previousAuthenticationId },
          transaction,
        });
      }

      ctx.redirect(GiteaUtils.url);
    } catch (err) {
      Logger.error(
        "Encountered error during Gitea OAuth callback",
        toError(err)
      );
      ctx.redirect(GiteaUtils.errorUrl("unauthenticated"));
    }
  }
);

export default router;
