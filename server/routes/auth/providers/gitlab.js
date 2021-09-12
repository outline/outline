// @flow
import passport from "@outlinewiki/koa-passport";
import Router from "koa-router";
import { Strategy as GitLabStrategy } from "passport-gitlab2";
import accountProvisioner from "../../../commands/accountProvisioner";
import env from "../../../env";
import { GitLabError } from "../../../errors";
import passportMiddleware from "../../../middlewares/passport";
import { StateStore } from "../../../utils/passport";

const router = new Router();
const providerName = "gitlab";
const GITLAB_APP_ID = process.env.GITLAB_APP_ID;
const GITLAB_APP_SECRET = process.env.GITLAB_APP_SECRET;
const GITLAB_URL = process.env.GITLAB_URL;

const scopes = [];

export async function request(endpoint: string, accessToken: string) {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

export const config = {
  name: "GitLab",
  enabled: !!GITLAB_APP_ID,
};

if (GITLAB_APP_ID) {
  const strategy = new GitLabStrategy(
    {
      clientID: GITLAB_APP_ID,
      clientSecret: GITLAB_APP_SECRET,
      callbackURL: `${env.URL}/auth/gitlab.callback`,
      baseURL: GITLAB_URL,
      passReqToCallback: true,
      store: new StateStore(),
    },
    async function (req, accessToken, refreshToken, profile, done) {
      try {
        profile = profile._json;

        const email = profile.email;
        if (!email) {
          throw new GitLabError(
            "'email' property is required but could not be found in user profile."
          );
        }

        const domain = email.split("@")[1];
        const subdomain = domain.split(".")[0];
        // Just set the domain as Team's Name as GitLab doesn't have concept of organization
        // User can the Team name anyway after creating it.
        const teamName = domain;

        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            name: teamName,
            domain,
            subdomain,
          },
          user: {
            name: profile.name,
            email,
            avatarUrl: profile.avatar_url,
          },
          authenticationProvider: {
            name: providerName,
            // GitLab doesn't organization concept, so just set providerName as id.
            providerId: providerName,
          },
          authentication: {
            // convert id to string.
            providerId: "" + profile.id,
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

  passport.use(strategy);

  router.get("gitlab", passport.authenticate(providerName));

  router.get("gitlab.callback", passportMiddleware(providerName));
}

export default router;
