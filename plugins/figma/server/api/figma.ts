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
      await Integration.create<Integration<IntegrationType.Embed>>(
        {
          service: IntegrationService.Figma,
          type: IntegrationType.Embed,
          userId: user.id,
          teamId: user.teamId,
          authenticationId: authentication.id,
          settings: {
            figma: {
              user: {
                id: oauth.user_id_string,
              },
            },
          },
        },
        { transaction }
      );

      ctx.redirect(FigmaUtils.successUrl());
    } catch (err) {
      Logger.error("Encountered error during Figma OAuth callback", err);
      ctx.redirect(FigmaUtils.errorUrl("unknown"));
    }
  }
);

export default router;
