import passport from "@outlinewiki/koa-passport";
import fetch from "fetch-with-proxy";
import Router from "koa-router";
import { Strategy as GithubStrategy } from "passport-github2";
import accountProvisioner from "@server/commands/accountProvisioner";
import env from "@server/env";
import passportMiddleware from "@server/middlewares/passport";
import { StateStore } from "@server/utils/passport";

const router = new Router();
const providerName = "github";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_ORGANIZATION = process.env.GITHUB_ORGANIZATION;

const scopes = ["read:org", "user:email"];

export async function request(endpoint: string, accessToken: string) {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `token ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

export const config = {
  name: "GitHub",
  enabled: !!GITHUB_CLIENT_ID,
};

if (GITHUB_CLIENT_ID) {
  if (GITHUB_ORGANIZATION === "") {
    throw new Error("`GITHUB_ORGANIZATION` required when using GitHub.");
  }

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
        const email = profile.emails[0].value;

        const orgInfo = await request(
          `https://api.github.com/orgs/${GITHUB_ORGANIZATION}`,
          accessToken
        );

        if (orgInfo.message === "Not Found") {
          throw new Error("Failed to retrieve organization information.");
        }

        // Verify if you are member of this orgnaization
        const isMember = await request(
          `https://api.github.com/orgs/${GITHUB_ORGANIZATION}/members/${profile.username}`,
          accessToken
        );

        if (isMember.message === "Not Found") {
          throw new Error("User not a member of the organization.");
        }

        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            name: orgInfo.company || orgInfo.name,
            avatarUrl: orgInfo.avatar_url,
            subdomain: GITHUB_ORGANIZATION,
          },
          user: {
            name: profile.displayName,
            email,
            avatarUrl: profile.photos[0].value,
          },
          authenticationProvider: {
            name: providerName,
            providerId: orgInfo.id,
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

  passport.use(strategy);

  router.get("github", passport.authenticate(providerName));

  router.get("github.callback", passportMiddleware(providerName));
}

export default router;
