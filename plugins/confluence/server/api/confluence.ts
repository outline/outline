import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration } from "@server/models";
import type { APIContext } from "@server/types";
import { ConfluenceUtils } from "../../shared/ConfluenceUtils";
import env from "../env";
import { getConfluenceConfig } from "../config";
import * as T from "./schema";

const router = new Router();

router.get(
  "confluence.callback",
  auth({ optional: true }),
  validate(T.ConfluenceCallbackSchema),
  apexAuthRedirect<T.ConfluenceCallbackReq>({
    getTeamId: (ctx) => ctx.input.query.state,
    getRedirectPath: (ctx, team) =>
      ConfluenceUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => ConfluenceUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.ConfluenceCallbackReq>) => {
    const { code, state: teamId, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const config = await getConfluenceConfig(user.teamId);
    const confluenceUrl = config.CONFLUENCE_URL;
    const clientId = config.CONFLUENCE_CLIENT_ID;
    const clientSecret = config.CONFLUENCE_CLIENT_SECRET;

    if (error) {
      ctx.redirect(ConfluenceUtils.errorUrl(error));
      return;
    }

    if (!code) {
      return ctx.redirect(ConfluenceUtils.errorUrl("no_code"));
    }

    if (!confluenceUrl || !clientId || !clientSecret) {
      return ctx.redirect(ConfluenceUtils.errorUrl("no_config"));
    }

    try {
      // Exchange code for access token (OAuth 2.0)
      const tokenResponse = await fetch(
        `${confluenceUrl}/plugins/servlet/oauth/access-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: ConfluenceUtils.callbackUrl({ baseUrl: user.team.url }),
          }),
        }
      );

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange code for token");
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user info
      const userResponse = await fetch(
        `${confluenceUrl}/rest/api/user/current`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info");
      }

      const confluenceUser = await userResponse.json();

      const scopes = tokenData.scope?.split(" ") || [];

      const authentication = await IntegrationAuthentication.create(
        {
          service: IntegrationService.Confluence,
          userId: user.id,
          teamId: user.teamId,
          token: accessToken,
          scopes,
        },
        { transaction }
      );

      await Integration.createWithCtx(createContext({ user, transaction }), {
        service: IntegrationService.Confluence,
        type: IntegrationType.Embed,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          confluence: {
            instance: {
              url: confluenceUrl,
              account: {
                id: confluenceUser.userKey || confluenceUser.accountId,
                name: confluenceUser.displayName || confluenceUser.username,
                avatarUrl: confluenceUser.profilePicture?.path || undefined,
              },
            },
          },
        },
      });

      ctx.redirect(ConfluenceUtils.url);
    } catch (err) {
      ctx.redirect(ConfluenceUtils.errorUrl("unauthenticated"));
    }
  }
);

export default router;
