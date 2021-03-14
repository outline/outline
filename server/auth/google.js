// @flow
import passport from "@outlinewiki/koa-passport";
import Router from "koa-router";
import { capitalize } from "lodash";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import accountProvisioner from "../commands/accountProvisioner";
import env from "../env";
import {
  GoogleWorkspaceRequiredError,
  GoogleWorkspaceInvalidError,
} from "../errors";
import auth from "../middlewares/authentication";
import passportMiddleware from "../middlewares/passport";
import { getAllowedDomains } from "../utils/authentication";
import { StateStore } from "../utils/passport";

const router = new Router();
const providerName = "google";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const allowedDomains = getAllowedDomains();

const scopes = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const config = {
  name: "Google",
  enabled: !!GOOGLE_CLIENT_ID,
};

if (GOOGLE_CLIENT_ID) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.URL}/auth/google.callback`,
        prompt: "select_account consent",
        passReqToCallback: true,
        store: new StateStore(),
        scope: scopes,
      },
      async function (req, accessToken, refreshToken, profile, done) {
        try {
          const domain = profile._json.hd;

          if (!domain) {
            throw new GoogleWorkspaceRequiredError();
          }

          if (allowedDomains.length && !allowedDomains.includes(domain)) {
            throw new GoogleWorkspaceInvalidError();
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
              name: profile.displayName,
              email: profile.email,
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

  router.get("google", passport.authenticate(providerName));

  router.get(
    "google.callback",
    auth({ required: false }),
    passportMiddleware(providerName)
  );
}

export default router;
