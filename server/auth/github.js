// @flow
import passport from "@outlinewiki/koa-passport";
import Router from "koa-router";
import { Strategy as GithubStrategy } from "passport-github2";
import accountProvisioner from "../commands/accountProvisioner";
import env from "../env";
import * as Github from "../github";
import auth from "../middlewares/authentication";
import passportMiddleware from "../middlewares/passport";
import { Authentication, Collection, Integration, Team } from "../models";
import { StateStore } from "../utils/passport";

const router = new Router();
const providerName = "github";
const GITHUB_CLIENT_ID = process.env.GITHUB_KEY;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_SECRET;

const scopes = ["repo", "read:org", "user"];

export const config = {
  name: "Github",
  enabled: !!GITHUB_CLIENT_ID,
};

if (GITHUB_CLIENT_ID) {
  const strategy = new GithubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: `${env.URL}/auth/github.callback`,
      passReqToCallback: true,
      store: new StateStore(),
      scope: scopes,
    },
    async function (req, accessToken, refreshToken, profile, done) {
      try {
        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            name: profile.displayName,
            avatarUrl: profile._json.avatar_url,
          },
          user: {
            name: profile.username,
            email: profile.emails[0].value,
            avatarUrl: profile._json.avatar_url,
          },
          authenticationProvider: {
            name: providerName,
            providerId: profile.id,
          },
          authentication: {
            providerId: profile.id,
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

  router.get(
    "github",
    passport.authenticate(providerName, { scope: scopes, session: false })
  );

  // start the oauth process and redirect user to Github
  // signin callback from Github
  router.get(
    "github.callback",
    auth({ required: false }),
    passportMiddleware(providerName)
  );

  router.get("github.commands", auth({ required: false }), async (ctx) => {
    const { code, state, error } = ctx.request.query;
    const user = ctx.state.user;
    ctx.assertPresent(code || error, "code is required");

    if (error) {
      ctx.redirect(`/settings/integrations/github?error=${error}`);
      return;
    }

    // this code block accounts for the root domain being unable to
    // access authentcation for subdomains. We must forward to the appropriate
    // subdomain to complete the oauth flow
    if (!user) {
      if (state) {
        try {
          const team = await Team.findByPk(state);
          return ctx.redirect(
            `${team.url}/auth${ctx.request.path}?${ctx.request.querystring}`
          );
        } catch (err) {
          return ctx.redirect(
            `/settings/integrations/github?error=unauthenticated`
          );
        }
      } else {
        return ctx.redirect(
          `/settings/integrations/github?error=unauthenticated`
        );
      }
    }

    const endpoint = `${process.env.URL || ""}/auth/github.commands`;
    const data = await Github.oauthAccess(code, endpoint);

    const authentication = await Authentication.create({
      service: "github",
      userId: user.id,
      teamId: user.teamId,
      token: data.access_token,
      scopes: data.scope.split(","),
    });

    await Integration.create({
      service: "github",
      type: "command",
      userId: user.id,
      teamId: user.teamId,
      authenticationId: authentication.id,
    });

    ctx.redirect("/settings/integrations/github");
  });

  router.get("github.post", auth({ required: false }), async (ctx) => {
    const { code, error, state } = ctx.request.query;
    const user = ctx.state.user;
    ctx.assertPresent(code || error, "code is required");

    const collectionId = state;
    ctx.assertUuid(collectionId, "collectionId must be an uuid");

    if (error) {
      ctx.redirect(`/settings/integrations/github?error=${error}`);
      return;
    }

    // this code block accounts for the root domain being unable to
    // access authentcation for subdomains. We must forward to the
    // appropriate subdomain to complete the oauth flow
    if (!user) {
      try {
        const collection = await Collection.findByPk(state);
        const team = await Team.findByPk(collection.teamId);
        return ctx.redirect(
          `${team.url}/auth${ctx.request.path}?${ctx.request.querystring}`
        );
      } catch (err) {
        return ctx.redirect(
          `/settings/integrations/github?error=unauthenticated`
        );
      }
    }

    const endpoint = `${process.env.URL || ""}/auth/github.post`;
    const data = await Github.oauthAccess(code, endpoint);

    const authentication = await Authentication.create({
      service: "github",
      userId: user.id,
      teamId: user.teamId,
      token: data.access_token,
      scopes: data.scope.split(","),
    });

    await Integration.create({
      service: "github",
      type: "post",
      userId: user.id,
      teamId: user.teamId,
      authenticationId: authentication.id,
      collectionId,
      events: [],
      // TODO: update for GitHub? The following were for Slack
      // settings: {
      //   url: data.incoming_webhook.url,
      //   channel: data.incoming_webhook.channel,
      //   channelId: data.incoming_webhook.channel_id,
      // },
    });

    ctx.redirect("/settings/integrations/github");
  });
}

export default router;
