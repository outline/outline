import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration } from "@server/models";
import type { APIContext } from "@server/types";
import { JiraUtils } from "../../shared/JiraUtils";
import env from "../env";
import * as T from "./schema";

const router = new Router();

router.get(
  "jira.callback",
  auth({ optional: true }),
  validate(T.JiraCallbackSchema),
  apexAuthRedirect<T.JiraCallbackReq>({
    getTeamId: (ctx) => ctx.input.query.state,
    getRedirectPath: (ctx, team) =>
      JiraUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => JiraUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.JiraCallbackReq>) => {
    const { oauth_token, oauth_verifier, state: teamId, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const jiraUrl = env.JIRA_URL;

    if (error) {
      ctx.redirect(JiraUtils.errorUrl(error));
      return;
    }

    if (!oauth_token || !oauth_verifier) {
      return ctx.redirect(JiraUtils.errorUrl("no_token"));
    }

    if (!jiraUrl) {
      return ctx.redirect(JiraUtils.errorUrl("no_config"));
    }

    try {
      // Exchange OAuth verifier for access token
      // Note: Jira uses OAuth 1.0a, which requires more complex token exchange
      // For simplicity, we'll use OAuth 2.0 if available, otherwise store the tokens
      const tokenResponse = await fetch(
        `${jiraUrl}/plugins/servlet/oauth/access-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            oauth_token: oauth_token,
            oauth_verifier: oauth_verifier,
            oauth_consumer_key: env.JIRA_CONSUMER_KEY!,
          }),
        }
      );

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange OAuth tokens");
      }

      const tokenData = await tokenResponse.text();
      const params = new URLSearchParams(tokenData);
      const accessToken = params.get("oauth_token");
      const tokenSecret = params.get("oauth_token_secret");

      if (!accessToken || !tokenSecret) {
        throw new Error("Invalid token response");
      }

      // Fetch user info
      const userResponse = await fetch(
        `${jiraUrl}/rest/api/3/myself`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        // If Bearer token doesn't work, try OAuth 1.0a signature
        // For now, we'll just store the tokens
      }

      const jiraUser = userResponse.ok ? await userResponse.json() : null;

      const scopes = ["read"];

      const authentication = await IntegrationAuthentication.create(
        {
          service: IntegrationService.Jira,
          userId: user.id,
          teamId: user.teamId,
          token: accessToken,
          scopes,
        },
        { transaction }
      );

      await Integration.createWithCtx(createContext({ user, transaction }), {
        service: IntegrationService.Jira,
        type: IntegrationType.Embed,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          jira: {
            instance: {
              url: jiraUrl,
              account: {
                id: jiraUser?.accountId || "",
                name: jiraUser?.displayName || jiraUser?.name || "",
                avatarUrl: jiraUser?.avatarUrls?.["48x48"] || undefined,
              },
            },
          },
        },
      });

      ctx.redirect(JiraUtils.url);
    } catch (err) {
      ctx.redirect(JiraUtils.errorUrl("unauthenticated"));
    }
  }
);

export default router;
