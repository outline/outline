// @flow
import passport from "@outlinewiki/koa-passport";
import { Console } from "@sentry/node/dist/integrations";
import Router from "koa-router";
import { capitalize } from "lodash";
const OAuth2Strategy = require("passport-oauth").OAuth2Strategy;
import accountProvisioner from "../../commands/accountProvisioner";
import env from "../../env";
import {
  OAuthWorkspaceRequiredError,
  OAuthWorkspaceInvalidError,
} from "../../errors";
import passportMiddleware from "../../middlewares/passport";
import { getAllowedDomains } from "../../utils/authentication";
import { StateStore } from "../../utils/passport";

const router = new Router();
const providerName = "oauth2";
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_CLIENT_URL = process.env.OAUTH_CLIENT_URL
const allowedDomains = getAllowedDomains();

export const config = {
  name: "oauth2",
  enabled: !!OAUTH_CLIENT_ID,
};
const scopes = [
  "member-read",
];
if (OAUTH_CLIENT_ID) {
  
  passport.use(
    new OAuth2Strategy(
      {
        callbackURL: `${env.URL}/auth/oauth2.callback`,
        authorizationURL: `${OAUTH_CLIENT_URL}/api/oauth/authorize`,
        tokenURL: `${OAUTH_CLIENT_URL}/api/oauth/token`,
        clientID: OAUTH_CLIENT_ID,
        clientSecret: OAUTH_CLIENT_SECRET,
        store: new StateStore(),
        passReqToCallback: true,
      },
      async function (req, accessToken, refreshToken, params, profile, done) {
        try {
          const domain = OAUTH_CLIENT_URL;

          if (!domain) {
            throw new OAuthWorkspaceRequiredError();
          }

          if (allowedDomains.length && !allowedDomains.includes(domain)) {
            throw new OAuthWorkspaceInvalidError();
          }

          const subdomain = domain.split(".")[0];
          const teamName = capitalize(subdomain);
          //
          const result = await accountProvisioner({
            ip: req.ip,
            team: {
              name: teamName,
              domain: null,
              subdomain: subdomain,
              avatarUrl: null,
            },
            user: {
              name: params.email,
              email: params.email,
              avatarUrl: null,
            },
            authenticationProvider: {
              name: providerName,
              providerId: domain,
            },
            authentication: {
              providerId: params.credentials_id.toString(),
              accessToken,
              refreshToken,
              scopes,
            },
          });
          console.log(result);
          
          return done(null, result.user, result);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  router.get("oauth2", passport.authenticate(providerName));

  router.get("oauth2.callback", passportMiddleware(providerName));
}

export default router;
