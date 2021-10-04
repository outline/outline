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

const GITLAB_CLIENT_ID = env.GITLAB_CLIENT_ID;
const GITLAB_CLIENT_SECRET = env.GITLAB_CLIENT_SECRET;
const GITLAB_BASEURL = env.GITLAB_BASEURL;
const GITLAB_GROUP = env.GITLAB_GROUP;

const scopes = ["read_api"];
const callbackURL = `${env.URL}/auth/gitlab.callback`;

export const config = {
  name: "GitLab",
  enabled: !!GITLAB_CLIENT_ID,
};

if (GITLAB_CLIENT_ID) {
  const strategy = new GitLabStrategy(
    {
      clientID: GITLAB_CLIENT_ID,
      clientSecret: GITLAB_CLIENT_SECRET,
      callbackURL: callbackURL,
      baseURL: GITLAB_BASEURL,
      passReqToCallback: true,
      store: new StateStore(),
      scope: scopes,
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

        // Check if we the user has access to the configured GitLab group
        const group = await request(
          `${GITLAB_BASEURL}/api/v4/groups/${GITLAB_GROUP}?with_projects=false`,
          accessToken
        );
        if (!group) {
          throw new GitLabError("Failed to load group profile.");
        }

        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            name: group.name,
            domain,
            subdomain,
            avatarUrl: group.avatar_url,
          },
          user: {
            name: profile.name,
            email,
            avatarUrl: profile.avatar_url,
          },
          authenticationProvider: {
            name: providerName,
            providerId: group.id.toString(),
          },
          authentication: {
            providerId: profile.id.toString(),
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
