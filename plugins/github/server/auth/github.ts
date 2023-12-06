import passport, { Profile } from "@outlinewiki/koa-passport";
import Router from "koa-router";
import { Strategy as GithubStrategy } from "passport-github2";
import slugify from "@shared/utils/slugify";
import accountProvisioner from "@server/commands/accountProvisioner";
import env from "@server/env";
import passportMiddleware from "@server/middlewares/passport";
import { User } from "@server/models";
import { AuthenticationResult } from "@server/types";
import {
  getClientFromContext,
  getTeamFromContext,
} from "@server/utils/passport";

const router = new Router();
const providerName = "github";

const scopes = ["read:org", "user:email"];

type GitHubProfile = Profile & {
  emails: {
    value: string;
  }[];
};

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GithubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: `${env.URL}/auth/github.callback`,
        passReqToCallback: true,
        scope: scopes,
      },
      async function (
        req,
        accessToken: string,
        refreshToken: string,
        profile: GitHubProfile,
        done: (
          err: Error | null,
          user: User | null,
          result?: AuthenticationResult
        ) => void
      ) {
        const team = getTeamFromContext(req);
        const client = getClientFromContext(req);
        const email = profile.emails[0].value;

        const domain = email.split("@")[1];
        const subdomain = slugify(domain);
        const name = profile.username ?? profile.displayName;

        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            teamId: team?.id,
            // https://github.com/outline/outline/pull/2388#discussion_r681120223
            name: "Wiki",
            domain,
            subdomain,
          },
          user: {
            name,
            email: profile.emails[0].value,
            avatarUrl: profile.photos?.[0].value,
          },
          authenticationProvider: {
            name: providerName,
            providerId: "github.com",
          },
          authentication: {
            providerId: profile.id,
            accessToken,
            refreshToken,
            expiresIn: 86400,
            scopes,
          },
        });
        return done(null, result.user, { ...result, client });
      }
    )
  );
  router.get("github", passport.authenticate(providerName));
}
router.get("github.callback", passportMiddleware(providerName));

export default router;
