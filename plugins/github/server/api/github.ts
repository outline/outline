import {
  createOAuthUserAuth,
  type GitHubAppAuthentication,
} from "@octokit/auth-oauth-user";
import type { Context } from "koa";
import Router from "koa-router";
import find from "lodash/find";
import { Octokit } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration, Team } from "@server/models";
import { APIContext } from "@server/types";
import { Github } from "../github";
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

if (Github.clientId && Github.clientSecret) {
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
        ctx.redirect(Github.errorUrl(error));
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
              Github.callbackUrl({
                baseUrl: team.url,
                params: ctx.request.querystring,
              })
            );
          } catch (err) {
            return ctx.redirect(Github.errorUrl("unauthenticated"));
          }
        } else {
          return ctx.redirect(Github.errorUrl("unauthenticated"));
        }
      }

      const github = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
          clientId: Github.clientId,
          clientSecret: Github.clientSecret,
          clientType: Github.clientType,
          code,
          state: teamId,
        },
      });

      const authResponse = (await github.auth()) as GitHubAppAuthentication;

      let installation;
      try {
        const installations = await github.paginate("GET /user/installations");
        installation = find(
          installations,
          (installation) => installation.id === installationId
        );
        if (!installation) {
          Logger.warn("installationId mismatch!");
          return ctx.redirect(Github.errorUrl("unauthenticated"));
        }
      } catch (err) {
        Logger.warn("Couldn't fetch user installations from Github", err);
        return ctx.redirect(Github.errorUrl("unauthenticated"));
      }

      const authentication = await IntegrationAuthentication.create(
        {
          service: IntegrationService.Github,
          userId: user.id,
          teamId: user.teamId,
          token: authResponse.token,
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
      ctx.redirect(Github.url);
    }
  );
}

export default router;
