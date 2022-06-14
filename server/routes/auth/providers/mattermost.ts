import passport from "@outlinewiki/koa-passport";
import { Request } from "koa";
import Router from "koa-router";
import { capitalize } from "lodash";
import { Profile } from "passport";
import { MattermostStrategy } from "passport-mattermost-oauth2";
import accountProvisioner, {
  AccountProvisionerResult,
} from "@server/commands/accountProvisioner";
import env from "@server/env";
import passportMiddleware from "@server/middlewares/passport";
import { User } from "@server/models";
import { StateStore } from "@server/utils/passport";

const router = new Router();
const providerName = "mattermost";

export const config = {
  name: providerName,
  enabled: !!env.MATTERMOST_CLIENT_ID,
};

type MattermostProfile = Profile & {
  email: string;
  picture: string;
  _json: {
    hd: string;
  };
};

if (
  env.MATTERMOST_CLIENT_ID &&
  env.MATTERMOST_CLIENT_SECRET &&
  env.MATTERMOST_BACKEND_URL
) {
  const strategy = new MattermostStrategy(
    {
      clientID: env.MATTERMOST_CLIENT_ID,
      clientSecret: env.MATTERMOST_CLIENT_SECRET,
      callbackURL: `${env.URL}/auth/mattermost.callback`,
      authorizationURL: `${env.MATTERMOST_BACKEND_URL}/oauth/authorize`,
      tokenURL: `${env.MATTERMOST_BACKEND_URL}/oauth/access_token`,
      userProfileURL: `${env.MATTERMOST_BACKEND_URL}/api/v4/users/me`,
      passReqToCallback: true,
      // @ts-expect-error StateStore
      store: new StateStore(),
      scope: [],
    },
    async function (
      req: Request,
      accessToken: string,
      refreshToken: string,
      params: { expires_in: number },
      profile: MattermostProfile,
      done: (
        err: Error | null,
        user: User | null,
        result?: AccountProvisionerResult
      ) => void
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore Cannot be undefined since env.MATTERMOST_BACKEND_URL if statement checking
        const subdomain = env.MATTERMOST_BACKEND_URL.split(".")[0];
        const teamName = capitalize(subdomain);
        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            name: teamName,
            domain: env.URL,
            subdomain: subdomain,
          },
          user: {
            email: profile.email,
            name: profile.displayName,
            username: profile.displayName,
          },
          authenticationProvider: {
            name: providerName,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            providerId: env.MATTERMOST_BACKEND_URL!,
          },
          authentication: {
            providerId: profile.id,
            accessToken,
            refreshToken,
            expiresIn: params.expires_in,
            scopes: [],
          },
        });
        return done(null, result.user, result);
      } catch (err) {
        return done(err, null);
      }
    }
  );
  strategy.name = providerName;
  passport.use(strategy);
  router.get(providerName, passport.authenticate(providerName));
  router.get(`${providerName}.callback`, passportMiddleware(providerName));
}

export default router;
