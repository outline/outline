import auth from "@server/middlewares/authentication";
import Router from "koa-router";
import * as T from "./schema";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import type { APIContext } from "@server/types";
import validate from "@server/middlewares/validate";
import { FigmaUtils } from "plugins/figma/shared/FigmaUtils";
import { transaction } from "@server/middlewares/transaction";
import Logger from "@server/logging/Logger";
import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration, IntegrationAuthentication } from "@server/models";
import { addSeconds } from "date-fns";
import { Figma } from "../figma";
import UploadIntegrationLogoTask from "@server/queues/tasks/UploadIntegrationLogoTask";

const router = new Router();

router.get(
  "figma.callback",
  auth({ optional: true }),
  validate(T.FigmaCallbackSchema),
  apexAuthRedirect<T.FigmaCallbackReq>({
    getTeamId: (ctx) => FigmaUtils.parseState(ctx.input.query.state)?.teamId,
    getRedirectPath: (ctx, team) =>
      FigmaUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => FigmaUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.FigmaCallbackReq>) => {
    const { code, error } = ctx.input.query;

    // Check error after any sub-domain redirection. Otherwise, the user will be redirected to the root domain.
    if (error) {
      ctx.redirect(FigmaUtils.errorUrl(error));
      return;
    }

    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    try {
      // validation middleware ensures that code is non-null at this point.
      const oauth = await Figma.oauthAccess(code!);
      const figmaAccount = await Figma.getInstalledAccount(oauth.access_token);

      const authentication = await IntegrationAuthentication.create(
        {
          service: IntegrationService.Figma,
          userId: user.id,
          teamId: user.teamId,
          token: oauth.access_token,
          refreshToken: oauth.refresh_token,
          expiresAt: addSeconds(Date.now(), oauth.expires_in),
          scopes: FigmaUtils.oauthScopes,
        },
        { transaction }
      );
      const integration = await Integration.create<
        Integration<IntegrationType.LinkedAccount>
      >(
        {
          service: IntegrationService.Figma,
          type: IntegrationType.LinkedAccount,
          userId: user.id,
          teamId: user.teamId,
          authenticationId: authentication.id,
          settings: {
            figma: {
              account: {
                id: figmaAccount.id,
                name: figmaAccount.handle,
                email: figmaAccount.email,
                avatarUrl: figmaAccount.img_url,
              },
            },
          },
        },
        { transaction }
      );

      transaction.afterCommit(async () => {
        await new UploadIntegrationLogoTask().schedule({
          integrationId: integration.id,
          logoUrl: figmaAccount.img_url,
        });
      });

      ctx.redirect(FigmaUtils.successUrl());
    } catch (err) {
      Logger.error("Encountered error during Figma OAuth callback", err);
      ctx.redirect(FigmaUtils.errorUrl("unknown"));
    }
  }
);

export default router;
