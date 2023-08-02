import passport from "@outlinewiki/koa-passport";
import type { Context } from "koa";
import Router from "koa-router";
import { Profile } from "passport";
import { Strategy as SlackStrategy } from "passport-slack-oauth2";
import { IntegrationService, IntegrationType } from "@shared/types";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import accountProvisioner from "@server/commands/accountProvisioner";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import passportMiddleware from "@server/middlewares/passport";
import {
  IntegrationAuthentication,
  Collection,
  Integration,
  Team,
  User,
} from "@server/models";
import { AppContext, AuthenticationResult } from "@server/types";
import {
  getClientFromContext,
  getTeamFromContext,
  StateStore,
} from "@server/utils/passport";
import { assertPresent, assertUuid } from "@server/validation";
import * as Slack from "../slack";

type SlackProfile = Profile & {
  team: {
    id: string;
    name: string;
    domain: string;
    image_192: string;
    image_230: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image_192: string;
    image_230: string;
  };
};

const router = new Router();
const providerName = "slack";
const scopes = [
  "identity.email",
  "identity.basic",
  "identity.avatar",
  "identity.team",
];

function redirectOnClient(ctx: Context, url: string) {
  ctx.type = "text/html";
  ctx.body = `
<html>
<head>
<meta http-equiv="refresh" content="0;URL='${url}'"/>
</head>`;
}

if (env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET) {
  const strategy = new SlackStrategy(
    {
      clientID: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      callbackURL: `${env.URL}/auth/slack.callback`,
      passReqToCallback: true,
      // @ts-expect-error StateStore
      store: new StateStore(),
      scope: scopes,
    },
    async function (
      ctx: Context,
      accessToken: string,
      refreshToken: string,
      params: { expires_in: number },
      profile: SlackProfile,
      done: (
        err: Error | null,
        user: User | null,
        result?: AuthenticationResult
      ) => void
    ) {
      try {
        const team = await getTeamFromContext(ctx);
        const client = getClientFromContext(ctx);

        const result = await accountProvisioner({
          ip: ctx.ip,
          team: {
            teamId: team?.id,
            name: profile.team.name,
            subdomain: profile.team.domain,
            avatarUrl: profile.team.image_230,
          },
          user: {
            name: profile.user.name,
            email: profile.user.email,
            avatarUrl: profile.user.image_192,
          },
          authenticationProvider: {
            name: providerName,
            providerId: profile.team.id,
          },
          authentication: {
            providerId: profile.user.id,
            accessToken,
            refreshToken,
            expiresIn: params.expires_in,
            scopes,
          },
        });
        return done(null, result.user, { ...result, client });
      } catch (err) {
        return done(err, null);
      }
    }
  );
  // For some reason the author made the strategy name capatilised, I don't know
  // why but we need everything lowercase so we just monkey-patch it here.
  strategy.name = providerName;
  passport.use(strategy);

  router.get("slack", passport.authenticate(providerName));

  router.get("slack.callback", passportMiddleware(providerName));

  router.get(
    "slack.commands",
    auth({
      optional: true,
    }),
    async (ctx: AppContext) => {
      const { code, state, error } = ctx.request.query;
      const { user } = ctx.state.auth;
      assertPresent(code || error, "code is required");

      if (error) {
        ctx.redirect(integrationSettingsPath(`slack?error=${error}`));
        return;
      }

      // this code block accounts for the root domain being unable to
      // access authentication for subdomains. We must forward to the appropriate
      // subdomain to complete the oauth flow
      if (!user) {
        if (state) {
          try {
            const team = await Team.findByPk(String(state), {
              rejectOnEmpty: true,
            });
            return redirectOnClient(
              ctx,
              `${team.url}/auth/slack.commands?${ctx.request.querystring}`
            );
          } catch (err) {
            return ctx.redirect(
              integrationSettingsPath(`slack?error=unauthenticated`)
            );
          }
        } else {
          return ctx.redirect(
            integrationSettingsPath(`slack?error=unauthenticated`)
          );
        }
      }

      const endpoint = `${env.URL}/auth/slack.commands`;
      const data = await Slack.oauthAccess(String(code), endpoint);
      const authentication = await IntegrationAuthentication.create({
        service: IntegrationService.Slack,
        userId: user.id,
        teamId: user.teamId,
        token: data.access_token,
        scopes: data.scope.split(","),
      });
      await Integration.create({
        service: IntegrationService.Slack,
        type: IntegrationType.Command,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          serviceTeamId: data.team_id,
        },
      });
      ctx.redirect(integrationSettingsPath("slack"));
    }
  );

  router.get(
    "slack.post",
    auth({
      optional: true,
    }),
    async (ctx: AppContext) => {
      const { code, error, state } = ctx.request.query;
      const { user } = ctx.state.auth;
      assertPresent(code || error, "code is required");

      const collectionId = state;
      assertUuid(collectionId, "collectionId must be an uuid");

      if (error) {
        ctx.redirect(integrationSettingsPath(`slack?error=${error}`));
        return;
      }

      // this code block accounts for the root domain being unable to
      // access authentication for subdomains. We must forward to the
      // appropriate subdomain to complete the oauth flow
      if (!user) {
        try {
          const collection = await Collection.findOne({
            where: {
              id: String(state),
            },
            rejectOnEmpty: true,
          });
          const team = await Team.findByPk(collection.teamId, {
            rejectOnEmpty: true,
          });
          return redirectOnClient(
            ctx,
            `${team.url}/auth/slack.post?${ctx.request.querystring}`
          );
        } catch (err) {
          return ctx.redirect(
            integrationSettingsPath(`slack?error=unauthenticated`)
          );
        }
      }

      const endpoint = `${env.URL}/auth/slack.post`;
      const data = await Slack.oauthAccess(code as string, endpoint);
      const authentication = await IntegrationAuthentication.create({
        service: IntegrationService.Slack,
        userId: user.id,
        teamId: user.teamId,
        token: data.access_token,
        scopes: data.scope.split(","),
      });

      await Integration.create({
        service: IntegrationService.Slack,
        type: IntegrationType.Post,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        collectionId,
        events: ["documents.update", "documents.publish"],
        settings: {
          url: data.incoming_webhook.url,
          channel: data.incoming_webhook.channel,
          channelId: data.incoming_webhook.channel_id,
        },
      });
      ctx.redirect(integrationSettingsPath("slack"));
    }
  );
}

export default router;
