import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import validateWebhook from "@server/middlewares/validateWebhook";
import { IntegrationAuthentication, Integration } from "@server/models";
import { APIContext } from "@server/types";
import { GitLabUtils } from "../../shared/GitLabUtils";
import { GitLab } from "../gitlab";
import GitLabWebhookTask from "../tasks/GitLabWebhookTask";
import * as T from "../schema";
import Logger from "@server/logging/Logger";
import { addSeconds } from "date-fns";

const router = new Router();

router.get(
  "gitlab.callback",
  auth({ optional: true }),
  validate(T.GitLabCallbackSchema),
  apexAuthRedirect<T.GitLabCallbackReq>({
    getTeamId: (ctx) => ctx.input.query.state,
    getRedirectPath: (ctx, team) =>
      GitLabUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => GitLabUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.GitLabCallbackReq>) => {
    const { code, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    if (error) {
      ctx.redirect(GitLabUtils.errorUrl(error));
      return;
    }

    try {
      const oauth = await GitLab.oauthAccess(code);
      const userInfo = await GitLab.getCurrentUser(oauth.access_token);

      const authentication = await IntegrationAuthentication.create(
        {
          service: IntegrationService.GitLab,
          userId: user.id,
          teamId: user.teamId,
          token: oauth.access_token,
          refreshToken: oauth.refresh_token,
          expiresAt: oauth.expires_in
            ? addSeconds(Date.now(), oauth.expires_in)
            : undefined,
          scopes: oauth.scope.split(" "),
        },
        { transaction }
      );

      await Integration.createWithCtx(createContext({ user, transaction }), {
        service: IntegrationService.GitLab,
        type: IntegrationType.Embed,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          gitlab: {
            installation: {
              id: userInfo.id,
              account: {
                id: userInfo.id,
                name: userInfo.username,
                avatarUrl: userInfo.avatar_url,
              },
            },
          },
        },
      });

      ctx.redirect(GitLabUtils.url);
    } catch (err) {
      Logger.error("Encountered error during Gitlab OAuth callback", err);
      ctx.redirect(GitLabUtils.errorUrl("unauthenticated"));
    }
  }
);

router.post(
  "gitlab.webhooks",
  validateWebhook({
    hmacSign: false,
    secretKey: GitLabUtils.clientSecret!,
    getSignatureFromHeader: (ctx) => {
      const { headers } = ctx.request;
      const signatureHeader = headers["x-gitlab-token"];
      return Array.isArray(signatureHeader)
        ? signatureHeader[0]
        : signatureHeader;
    },
  }),
  async (ctx: APIContext) => {
    const { headers, body } = ctx.request;

    await new GitLabWebhookTask().schedule({
      payload: body,
      headers,
    });

    ctx.status = 202;
  }
);

export default router;
