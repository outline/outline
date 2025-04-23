import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Integration, IntegrationAuthentication, Team } from "@server/models";
import { APIContext } from "@server/types";
import { NotionClient } from "../notion";
import * as T from "./schema";
import { NotionUtils } from "plugins/notion/shared/NotionUtils";

const router = new Router();

router.get(
  "notion.callback",
  auth({ optional: true }),
  validate(T.NotionCallbackSchema),
  transaction(),
  async (ctx: APIContext<T.NotionCallbackReq>) => {
    const { code, state, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    let parsedState;
    try {
      parsedState = NotionUtils.parseState(state);
    } catch {
      ctx.redirect(NotionUtils.errorUrl("invalid_state"));
      return;
    }

    const { teamId } = parsedState;

    // This code block accounts for the root domain being unable to access authentication for subdomains.
    // We must forward to the appropriate subdomain to complete the oauth flow.
    if (!user) {
      if (teamId) {
        try {
          const team = await Team.findByPk(teamId, {
            rejectOnEmpty: true,
            transaction,
          });

          return parseDomain(ctx.host).teamSubdomain === team.subdomain
            ? ctx.redirect("/")
            : ctx.redirectOnClient(
                NotionUtils.callbackUrl({
                  baseUrl: team.url,
                  params: ctx.request.querystring,
                })
              );
        } catch (err) {
          Logger.error(`Error fetching team for teamId: ${teamId}!`, err);
          return ctx.redirect(NotionUtils.errorUrl("unauthenticated"));
        }
      } else {
        return ctx.redirect(NotionUtils.errorUrl("unauthenticated"));
      }
    }

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
