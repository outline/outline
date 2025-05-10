import passport from "@outlinewiki/koa-passport";
import type { Context } from "koa";
import Router from "koa-router";
import { Profile } from "passport";
import { Strategy as SlackStrategy } from "passport-slack-oauth2";
import { IntegrationService, IntegrationType } from "@shared/types";
import accountProvisioner from "@server/commands/accountProvisioner";
import { ValidationError } from "@server/errors";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import passportMiddleware from "@server/middlewares/passport";
import validate from "@server/middlewares/validate";
import {
  IntegrationAuthentication,
  Integration,
  User,
  Collection,
} from "@server/models";
import { authorize } from "@server/policies";
import { sequelize } from "@server/storage/database";
import { APIContext, AuthenticationResult } from "@server/types";
import {
  getClientFromContext,
  getTeamFromContext,
  StateStore,
} from "@server/utils/passport";
import env from "../env";
import * as Slack from "../slack";
import * as T from "./schema";
import { SlackUtils } from "plugins/slack/shared/SlackUtils";

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

if (env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET) {
  const strategy = new SlackStrategy(
    {
      clientID: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      callbackURL: SlackUtils.callbackUrl(),
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
    "slack.post",
    auth({ optional: true }),
    validate(T.SlackPostSchema),
    apexAuthRedirect<T.SlackPostReq>({
      getTeamId: (ctx) => SlackUtils.parseState(ctx.input.query.state)?.teamId,
      getRedirectPath: (ctx, team) =>
        SlackUtils.connectUrl({
          baseUrl: team.url,
          params: ctx.request.querystring,
        }),
      getErrorPath: () => SlackUtils.errorUrl("unauthenticated"),
    }),
    async (ctx: APIContext<T.SlackPostReq>) => {
      const { code, error, state } = ctx.input.query;
      const { user } = ctx.state.auth;

      if (error) {
        ctx.redirect(SlackUtils.errorUrl(error));
        return;
      }

      let parsedState;
      try {
        parsedState = SlackUtils.parseState<{
          collectionId: string;
        }>(state);
      } catch (err) {
        throw ValidationError("Invalid state");
      }

      const { collectionId, type } = parsedState;

      switch (type) {
        case IntegrationType.Post: {
          const collection = await Collection.scope({
            method: ["withMembership", user.id],
          }).findByPk(collectionId);
          authorize(user, "read", collection);
          authorize(user, "update", user.team);

          // validation middleware ensures that code is non-null at this point
          const data = await Slack.oauthAccess(code!, SlackUtils.connectUrl());

          await sequelize.transaction(async (transaction) => {
            const authentication = await IntegrationAuthentication.create(
              {
                service: IntegrationService.Slack,
                userId: user.id,
                teamId: user.teamId,
                token: data.access_token,
                scopes: data.scope.split(","),
              },
              { transaction }
            );
            await Integration.create(
              {
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
              },
              { transaction }
            );
          });
          break;
        }

        case IntegrationType.Command: {
          authorize(user, "update", user.team);

          // validation middleware ensures that code is non-null at this point
          const data = await Slack.oauthAccess(code!, SlackUtils.connectUrl());

          await sequelize.transaction(async (transaction) => {
            const authentication = await IntegrationAuthentication.create(
              {
                service: IntegrationService.Slack,
                userId: user.id,
                teamId: user.teamId,
                token: data.access_token,
                scopes: data.scope.split(","),
              },
              { transaction }
            );
            await Integration.create(
              {
                service: IntegrationService.Slack,
                type: IntegrationType.Command,
                userId: user.id,
                teamId: user.teamId,
                authenticationId: authentication.id,
                settings: {
                  serviceTeamId: data.team_id,
                },
              },
              { transaction }
            );
          });
          break;
        }

        case IntegrationType.LinkedAccount: {
          // validation middleware ensures that code is non-null at this point
          const data = await Slack.oauthAccess(code!, SlackUtils.connectUrl());
          await Integration.create({
            service: IntegrationService.Slack,
            type: IntegrationType.LinkedAccount,
            userId: user.id,
            teamId: user.teamId,
            settings: {
              slack: {
                serviceUserId: data.user_id,
                serviceTeamId: data.team_id,
              },
            },
          });
          break;
        }

        default:
          throw ValidationError("Invalid integration type");
      }

      ctx.redirect(SlackUtils.url);
    }
  );
}

export default router;
