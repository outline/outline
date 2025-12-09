import Router from "koa-router";
import fetch from "node-fetch";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration } from "@server/models";
import { APIContext } from "@server/types";
import { GitLabUtils } from "../../shared/GitLabUtils";
import env from "../env";
import { GitLab } from "../gitlab";
import * as T from "./schema";

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
    const { code, state: error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    if (error) {
      ctx.redirect(GitLabUtils.errorUrl(error));
      return;
    }

    // Exchange code for access token
    const tokenUrl = "https://gitlab.com/oauth/token";
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITLAB_CLIENT_ID,
        client_secret: env.GITLAB_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: GitLabUtils.callbackUrl(),
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info to get the account details
    const userInfo = await GitLab.getCurrentUser(accessToken);

    const scopes = ["api", "read_api", "read_user"];

    const authentication = await IntegrationAuthentication.create(
      {
        service: IntegrationService.GitLab,
        userId: user.id,
        teamId: user.teamId,
        token: accessToken,
        scopes,
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
  }
);

export default router;
