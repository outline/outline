import passport from "@outlinewiki/koa-passport";
import { Request } from "koa";
import Router from "koa-router";
import { capitalize } from "lodash";
import { Profile } from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import accountProvisioner, {
  AccountProvisionerResult,
} from "@server/commands/accountProvisioner";
import env from "@server/env";
import { GoogleWorkspaceRequiredError } from "@server/errors";
import passportMiddleware from "@server/middlewares/passport";
import { User } from "@server/models";
import { StateStore } from "@server/utils/passport";

const router = new Router();
const providerName = "google";
const scopes = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const config = {
  name: "Google",
  enabled: !!env.GOOGLE_CLIENT_ID,
};

type GoogleProfile = Profile & {
  email: string;
  picture: string;
  _json: {
    hd: string;
  };
};

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.URL}/auth/google.callback`,
        passReqToCallback: true,
        // @ts-expect-error StateStore
        store: new StateStore(),
        scope: scopes,
      },
      async function (
        req: Request,
        accessToken: string,
        refreshToken: string,
        profile: GoogleProfile,
        done: (
          err: Error | null,
          user: User | null,
          result?: AccountProvisionerResult
        ) => void
      ) {
        try {
          const domain = profile._json.hd;

          if (!domain) {
            throw GoogleWorkspaceRequiredError();
          }

          const subdomain = domain.split(".")[0];
          const teamName = capitalize(subdomain);
          const result = await accountProvisioner({
            ip: req.ip,
            team: {
              name: teamName,
              domain,
              subdomain,
            },
            user: {
              email: profile.email,
              name: profile.displayName,
              avatarUrl: profile.picture,
            },
            authenticationProvider: {
              name: providerName,
              providerId: domain,
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
    )
  );

  router.get(
    "google",
    passport.authenticate(providerName, {
      accessType: "offline",
      prompt: "select_account consent",
    })
  );

  router.get("google.callback", passportMiddleware(providerName));
}

export default router;
