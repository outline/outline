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
const KOALA_CLIENT_ID = process.env.KOALA_CLIENT_ID;
const KOALA_CLIENT_SECRET = process.env.KOALA_CLIENT_SECRET;
const KOALA_CLIENT_URL = process.env.KOALA_CLIENT_URL
const allowedDomains = getAllowedDomains();

export const config = {
  name: "Koala",
  enabled: !!KOALA_CLIENT_ID,
};
const scopes = [
  "member-read",
];
if (KOALA_CLIENT_ID) {
  
  passport.use(
    new OAuth2Strategy(
      {
        callbackURL: `${env.URL}/auth/oauth2.callback`,
        authorizationURL: `${KOALA_CLIENT_URL}/api/oauth/authorize`,
        tokenURL: `${KOALA_CLIENT_URL}/api/oauth/token`,
        clientID: KOALA_CLIENT_ID,
        clientSecret: KOALA_CLIENT_SECRET,
        store: new StateStore(),
        passReqToCallback: true,
      },
      async function (req, accessToken, refreshToken, params, profile, done) {
        try {
          const domain = KOALA_CLIENT_URL;

          if (!domain) {
            throw new OAuthWorkspaceRequiredError();
          }

          if (allowedDomains.length && !allowedDomains.includes(domain)) {
            throw new OAuthWorkspaceInvalidError();
          }
          const subdomain = domain.split(".")[0].replace(/(^\w+:|^)\/\//, '');
          const teamName = capitalize("sticky compendium");
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
              isAdmin: (params.credentials_type == "Admin"),
              avatarUrl: null,
            },
            authenticationProvider: {
              name: providerName,
              providerId: domain,
            },
            authentication: {
              providerId:  `${params.credentials_type}:${params.credentials_id}` ,
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
  router.get("oauth2", passport.authenticate(providerName));

  router.get("oauth2.callback", passportMiddleware(providerName));
}

export default router;
