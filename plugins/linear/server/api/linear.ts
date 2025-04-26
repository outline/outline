import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration, Team } from "@server/models";
import { APIContext } from "@server/types";
import { Linear } from "../linear";
import UploadLinearWorkspaceLogoTask from "../tasks/UploadLinearWorkspaceLogoTask";
import * as T from "./schema";
import { LinearUtils } from "plugins/linear/shared/LinearUtils";

const router = new Router();

router.get(
  "linear.callback",
  auth({
    optional: true,
  }),
  validate(T.LinearCallbackSchema),
  transaction(),
  async (ctx: APIContext<T.LinearCallbackReq>) => {
    const { code, state, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    let parsedState;
    try {
      parsedState = LinearUtils.parseState(state);
    } catch {
      ctx.redirect(LinearUtils.errorUrl("invalid_state"));
      return;
    }

    const { teamId } = parsedState;

    // this code block accounts for the root domain being unable to
    // access authentication for subdomains. We must forward to the appropriate
    // subdomain to complete the oauth flow
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
                LinearUtils.callbackUrl({
                  baseUrl: team.url,
                  params: ctx.request.querystring,
                })
              );
        } catch (err) {
          Logger.error(`Error fetching team for teamId: ${teamId}!`, err);
          return ctx.redirect(LinearUtils.errorUrl("unauthenticated"));
        }
      } else {
        return ctx.redirect(LinearUtils.errorUrl("unauthenticated"));
      }
    }

    // Check error after any sub-domain redirection. Otherwise, the user will be redirected to the root domain.
    if (error) {
      ctx.redirect(LinearUtils.errorUrl(error));
      return;
    }

    // validation middleware ensures that code is non-null at this point.
    const oauth = await Linear.oauthAccess(code!);
    const workspace = await Linear.getInstalledWorkspace(oauth.access_token);

    const authentication = await IntegrationAuthentication.create(
      {
        service: IntegrationService.Linear,
        userId: user.id,
        teamId: user.teamId,
        token: oauth.access_token,
        scopes: oauth.scope.split(" "),
      },
      { transaction }
    );
    const integration = await Integration.create<
      Integration<IntegrationType.Embed>
    >(
      {
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          linear: {
            workspace: {
              id: workspace.id,
              name: workspace.name,
              key: workspace.urlKey,
              logoUrl: workspace.logoUrl,
            },
          },
        },
      },
      { transaction }
    );

    transaction.afterCommit(async () => {
      await UploadLinearWorkspaceLogoTask.schedule({
        integrationId: integration.id,
        logoUrl: workspace.logoUrl,
      });
    });

    ctx.redirect(LinearUtils.successUrl());
  }
);

export default router;
