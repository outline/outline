import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Integration, IntegrationAuthentication } from "@server/models";
import { APIContext } from "@server/types";
import { NotionClient } from "../notion";
import * as T from "./schema";
import { NotionUtils } from "plugins/notion/shared/NotionUtils";

const router = new Router();

router.get(
  "notion.callback",
  auth({ optional: true }),
  validate(T.NotionCallbackSchema),
  apexAuthRedirect<T.NotionCallbackReq>({
    getTeamId: (ctx) => NotionUtils.parseState(ctx.input.query.state)?.teamId,
    getRedirectPath: (ctx, team) =>
      NotionUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => NotionUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.NotionCallbackReq>) => {
    const { code, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    // Check error after any sub-domain redirection. Otherwise, the user will be redirected to the root domain.
    if (error) {
      ctx.redirect(NotionUtils.errorUrl(error));
      return;
    }

    // validation middleware ensures that code is non-null at this point.
    const data = await NotionClient.oauthAccess(code!);

    const authentication = await IntegrationAuthentication.create(
      {
        service: IntegrationService.Notion,
        userId: user.id,
        teamId: user.teamId,
        token: data.access_token,
      },
      { transaction }
    );
    const integration = await Integration.create<
      Integration<IntegrationType.Import>
    >(
      {
        service: IntegrationService.Notion,
        type: IntegrationType.Import,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          externalWorkspace: {
            id: data.workspace_id,
            name: data.workspace_name ?? "Notion import",
            iconUrl: data.workspace_icon ?? undefined,
          },
        },
      },
      { transaction }
    );

    ctx.redirect(NotionUtils.successUrl(integration.id));
  }
);

export default router;
