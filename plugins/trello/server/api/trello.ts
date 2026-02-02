import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration } from "@server/models";
import type { APIContext } from "@server/types";
import { TrelloUtils } from "../../shared/TrelloUtils";
import env from "../env";
import * as T from "./schema";

const router = new Router();

router.get(
  "trello.callback",
  auth({ optional: true }),
  validate(T.TrelloCallbackSchema),
  apexAuthRedirect<T.TrelloCallbackReq>({
    getTeamId: (ctx) => ctx.input.query.state,
    getRedirectPath: (ctx, team) =>
      TrelloUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => TrelloUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.TrelloCallbackReq>) => {
    const { oauth_token, oauth_verifier, state: teamId, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    if (error) {
      ctx.redirect(TrelloUtils.errorUrl(error));
      return;
    }

    if (!oauth_token || !oauth_verifier) {
      return ctx.redirect(TrelloUtils.errorUrl("no_token"));
    }

    try {
      // Exchange OAuth verifier for access token
      const tokenResponse = await fetch(
        "https://trello.com/1/OAuthGetAccessToken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            oauth_consumer_key: env.TRELLO_API_KEY!,
            oauth_token: oauth_token,
            oauth_verifier: oauth_verifier,
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

      if (!accessToken) {
        throw new Error("Invalid token response");
      }

      // Fetch user info
      const userResponse = await fetch(
        `https://api.trello.com/1/members/me?key=${env.TRELLO_API_KEY}&token=${accessToken}&fields=fullName,username,avatarUrl`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info");
      }

      const trelloUser = await userResponse.json();

      const scopes = ["read"];

      const authentication = await IntegrationAuthentication.create(
        {
          service: IntegrationService.Trello,
          userId: user.id,
          teamId: user.teamId,
          token: accessToken,
          scopes,
        },
        { transaction }
      );

      await Integration.createWithCtx(createContext({ user, transaction }), {
        service: IntegrationService.Trello,
        type: IntegrationType.Embed,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          trello: {
            account: {
              id: trelloUser.id,
              name: trelloUser.fullName || trelloUser.username,
              avatarUrl: trelloUser.avatarUrl || undefined,
            },
          },
        },
      });

      ctx.redirect(TrelloUtils.url);
    } catch (err) {
      ctx.redirect(TrelloUtils.errorUrl("unauthenticated"));
    }
  }
);

export default router;
