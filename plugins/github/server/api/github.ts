import type { Context } from "koa";
import Router from "koa-router";
import { App } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import env from "@server/env";
import { InvalidRequestError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration, Team } from "@server/models";
import { APIContext } from "@server/types";
import * as Github from "../github";
import * as T from "./schema";

const router = new Router();

function redirectOnClient(ctx: Context, url: string) {
  ctx.type = "text/html";
  ctx.body = `
<html>
<head>
<meta http-equiv="refresh" content="0;URL='${url}'"/>
</head>`;
}

if (env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY) {
  const app = new App({
    appId: env.GITHUB_APP_ID,
    privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
      "ascii"
    ),
  });

  router.get(
    "github.callback",
    auth({
      optional: true,
    }),
    validate(T.GithubCallbackSchema),
    transaction(),
    async (ctx: APIContext<T.GithubCallbackReq>) => {
      const {
        code,
        state: teamId,
        error,
        installation_id: installationId,
      } = ctx.input.query;
      const { user } = ctx.state.auth;
      const { transaction } = ctx.state;

      if (error) {
        ctx.redirect(integrationSettingsPath(`github?error=${error}`));
        return;
      }

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
            return redirectOnClient(
              ctx,
              `${team.url}/api/github.callback?${ctx.request.querystring}`
            );
          } catch (err) {
            return ctx.redirect(
              integrationSettingsPath(`github?error=unauthenticated`)
            );
          }
        } else {
          return ctx.redirect(
            integrationSettingsPath(`github?error=unauthenticated`)
          );
        }
      }

      const octokit = await app.getInstallationOctokit(installationId);

      let installation;
      try {
        const res = await octokit.request(
          "GET /app/installations/{installation_id}",
          { installation_id: installationId }
        );
        installation = res.data;
      } catch (err) {
        throw InvalidRequestError(err.message);
      }

      const endpoint = `${env.URL}/api/github.callback`;
      // validation middleware ensures that code is non-null at this point
      const data = await Github.oauthAccess(code!, endpoint);
      const authentication = await IntegrationAuthentication.create(
        {
          service: IntegrationService.Github,
          userId: user.id,
          teamId: user.teamId,
          token: data.access_token,
        },
        { transaction }
      );
      await Integration.create(
        {
          service: IntegrationService.Github,
          type: IntegrationType.Embed,
          userId: user.id,
          teamId: user.teamId,
          authenticationId: authentication.id,
          settings: {
            github: {
              installation: {
                id: installationId,
                accountName:
                  // @ts-expect-error Property 'login' does not exist on type
                  installation.account?.name ?? installation.account?.login,
              },
            },
          },
        },
        { transaction }
      );
      ctx.redirect(integrationSettingsPath("github"));
    }
  );
}

export default router;
