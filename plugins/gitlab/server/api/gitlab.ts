import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration } from "@server/models";
import type { APIContext } from "@server/types";
import { GitLabUtils } from "../../shared/GitLabUtils";
import { getGitLabConfig, isGitLabConfigured } from "../config";
import * as T from "./schema";

const router = new Router();

router.get(
  "gitlab.redirect",
  auth(),
  validate(T.GitLabCallbackSchema),
  async (ctx: APIContext<T.GitLabCallbackReq>) => {
    const { state: teamId } = ctx.input.query;
    const { user } = ctx.state.auth;

    if (!teamId || teamId !== user.teamId) {
      ctx.redirect(GitLabUtils.errorUrl("unauthenticated"));
      return;
    }

    const configured = await isGitLabConfigured(user.teamId);

    if (!configured) {
      ctx.redirect(GitLabUtils.errorUrl("not_configured"));
      return;
    }

    const config = await getGitLabConfig(user.teamId);

    if (!config.GITLAB_URL || !config.GITLAB_CLIENT_ID) {
      ctx.redirect(GitLabUtils.errorUrl("not_configured"));
      return;
    }

    const params = new URLSearchParams({
      client_id: config.GITLAB_CLIENT_ID,
      redirect_uri: GitLabUtils.callbackUrl({ baseUrl: user.team.url }),
      response_type: "code",
      scope: "api read_user read_repository",
      state: teamId,
    });

    ctx.redirect(`${config.GITLAB_URL}/oauth/authorize?${params.toString()}`);
  }
);

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
    const { code, state: teamId, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const config = await getGitLabConfig(user.teamId);

    if (!config.GITLAB_URL || !config.GITLAB_CLIENT_ID || !config.GITLAB_CLIENT_SECRET) {
      ctx.redirect(GitLabUtils.errorUrl("not_configured"));
      return;
    }

    const gitlabUrl = config.GITLAB_URL;

    if (error) {
      ctx.redirect(GitLabUtils.errorUrl(error));
      return;
    }

    if (!code) {
      return ctx.redirect(GitLabUtils.errorUrl("no_code"));
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(`${gitlabUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: config.GITLAB_CLIENT_ID,
          client_secret: config.GITLAB_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: GitLabUtils.callbackUrl({ baseUrl: user.team.url }),
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange code for token");
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user info to get account details
      const userResponse = await fetch(`${gitlabUrl}/api/v4/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info");
      }

      const gitlabUser = await userResponse.json();

      const scopes = tokenData.scope?.split(" ") || [];

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
            instance: {
              url: gitlabUrl,
              account: {
                id: gitlabUser.id,
                name: gitlabUser.username || gitlabUser.name,
                avatarUrl: gitlabUser.avatar_url,
              },
            },
          },
        },
      });

      ctx.redirect(GitLabUtils.url);
    } catch (err) {
      ctx.redirect(GitLabUtils.errorUrl("unauthenticated"));
    }
  }
);

export default router;
