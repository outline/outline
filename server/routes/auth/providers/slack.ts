import passport from "@outlinewiki/koa-passport";
import { Request } from "koa";
import Router from "koa-router";
import { Profile } from "passport";
import { Strategy as SlackStrategy } from "passport-slack-oauth2";
import accountProvisioner, {
  AccountProvisionerResult,
} from "@server/commands/accountProvisioner";
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
import { StateStore } from "@server/utils/passport";
import * as Slack from "@server/utils/slack";
import { assertPresent, assertUuid } from "@server/validation";

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

export const config = {
  name: "Slack",
  enabled: !!env.SLACK_CLIENT_ID,
};

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
      req: Request,
      accessToken: string,
      refreshToken: string,
      profile: SlackProfile,
      done: (
        err: Error | null,
        user: User | null,
        result?: AccountProvisionerResult
      ) => void
    ) {
      try {
        const result = await accountProvisioner({
          ip: req.ip,
          team: {
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
            scopes,
          },
        });
        return done(null, result.user, result);
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
      required: false,
    }),
    async (ctx) => {
      const { code, state, error } = ctx.request.query;
      const { user } = ctx.state;
      assertPresent(code || error, "code is required");

      if (error) {
        ctx.redirect(`/settings/integrations/slack?error=${error}`);
        return;
      }

      // this code block accounts for the root domain being unable to
      // access authentication for subdomains. We must forward to the appropriate
      // subdomain to complete the oauth flow
      if (!user) {
        if (state) {
          try {
            const team = await Team.findByPk(state as string);
            return ctx.redirect(
              `${team!.url}/auth${ctx.request.path}?${ctx.request.querystring}`
            );
          } catch (err) {
            return ctx.redirect(
              `/settings/integrations/slack?error=unauthenticated`
            );
          }
        } else {
          return ctx.redirect(
            `/settings/integrations/slack?error=unauthenticated`
          );
        }
      }

      const endpoint = `${env.URL}/auth/slack.commands`;
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | string[] | undefined' i... Remove this comment to see the full error message
      const data = await Slack.oauthAccess(code, endpoint);
      const authentication = await IntegrationAuthentication.create({
        service: "slack",
        userId: user.id,
        teamId: user.teamId,
        token: data.access_token,
        scopes: data.scope.split(","),
      });
      await Integration.create({
        service: "slack",
        type: "command",
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          serviceTeamId: data.team_id,
        },
      });
      ctx.redirect("/settings/integrations/slack");
    }
  );

  router.get(
    "slack.post",
    auth({
      required: false,
    }),
    async (ctx) => {
      const { code, error, state } = ctx.request.query;
      const { user } = ctx.state;
      assertPresent(code || error, "code is required");

      const collectionId = state;
      assertUuid(collectionId, "collectionId must be an uuid");

      if (error) {
        ctx.redirect(`/settings/integrations/slack?error=${error}`);
        return;
      }

      // this code block accounts for the root domain being unable to
      // access authentication for subdomains. We must forward to the
      // appropriate subdomain to complete the oauth flow
      if (!user) {
        try {
          const collection = await Collection.findByPk(state as string);
          const team = await Team.findByPk(collection!.teamId);
          return ctx.redirect(
            `${team!.url}/auth${ctx.request.path}?${ctx.request.querystring}`
          );
        } catch (err) {
          return ctx.redirect(
            `/settings/integrations/slack?error=unauthenticated`
          );
        }
      }

      const endpoint = `${env.URL}/auth/slack.post`;
      const data = await Slack.oauthAccess(code as string, endpoint);
      const authentication = await IntegrationAuthentication.create({
        service: "slack",
        userId: user.id,
        teamId: user.teamId,
        token: data.access_token,
        scopes: data.scope.split(","),
      });

      await Integration.create({
        service: "slack",
        type: "post",
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
      ctx.redirect("/settings/integrations/slack");
    }
  );
}

export default router;
