// @flow
import passport from "@outlinewiki/koa-passport";
import fetch from "fetch-with-proxy";
import Router from "koa-router";
import { Strategy } from "passport-oauth2";
import accountProvisioner from "../../commands/accountProvisioner";
import env from "../../env";
import {
  OAuth2MalformedUserInfoError,
  AuthenticationError,
} from "../../errors";
import passportMiddleware from "../../middlewares/passport";
import { getAllowedDomains } from "../../utils/authentication";
import { StateStore } from "../../utils/passport";

const router = new Router();
const providerName = "oidc";
const OIDC_DISPLAY_NAME = process.env.OIDC_DISPLAY_NAME || "OpenID Connect";
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID;
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET;
const OIDC_AUTH_URI = process.env.OIDC_AUTH_URI;
const OIDC_TOKEN_URI = process.env.OIDC_TOKEN_URI;
const OIDC_USERINFO_URI = process.env.OIDC_USERINFO_URI;
const OIDC_TEAM_CLAIM = process.env.OIDC_TEAM_CLAIM || "team_name";
const OIDC_SCOPES = process.env.OIDC_SCOPES || "";
const allowedDomains = getAllowedDomains();

export const config = {
  name: OIDC_DISPLAY_NAME,
  enabled: !!OIDC_CLIENT_ID,
};

const scopes = OIDC_SCOPES.split(" ");

Strategy.prototype.userProfile = async function (accessToken, done) {
  try {
    const response = await fetch(OIDC_USERINFO_URI, {
      credentials: "same-origin",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    try {
      return done(null, await response.json());
    } catch (err) {
      return done(err);
    }
  } catch (err) {
    return done(err);
  }
};

if (OIDC_CLIENT_ID) {
  passport.use(
    providerName,
    new Strategy(
      {
        authorizationURL: OIDC_AUTH_URI,
        tokenURL: OIDC_TOKEN_URI,
        clientID: OIDC_CLIENT_ID,
        clientSecret: OIDC_CLIENT_SECRET,
        callbackURL: `${env.URL}/auth/${providerName}.callback`,
        passReqToCallback: true,
        scope: OIDC_SCOPES,
        store: new StateStore(),
        state: true,
        pkce: false,
      },

      // OpenID Connect standard profile claims can be found in the official
      // specification.
      // https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims

      // Non-standard claims may be configured by individual identity providers.
      // Any claim supplied in response to the userinfo request will be
      // available on the `profile` parameter
      async function (req, accessToken, refreshToken, profile, done) {
        try {
          const parts = profile.email.split("@");
          const domain = parts.length && parts[1];

          if (!domain) {
            throw new OAuth2MalformedUserInfoError();
          }

          if (allowedDomains.length && !allowedDomains.includes(domain)) {
            throw new AuthenticationError(
              `Domain ${domain} is not on the whitelist`
            );
          }

          const subdomain = domain.split(".")[0];

          const result = await accountProvisioner({
            ip: req.ip,
            team: {
              name: profile[OIDC_TEAM_CLAIM],
              domain,
              subdomain,
            },
            user: {
              name: profile.name,
              email: profile.email,
              avatarUrl: profile.picture,
            },
            authenticationProvider: {
              name: providerName,
              providerId: domain,
            },
            authentication: {
              providerId: profile.sub,
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

  router.get(providerName, passport.authenticate(providerName));

  router.get(`${providerName}.callback`, passportMiddleware(providerName));
}

export default router;
