// @flow
import passport from "@outlinewiki/koa-passport";
import jwt from "jsonwebtoken";
import Router from "koa-router";
import { capitalize } from "lodash";
import { Strategy as AzureStrategy } from "passport-azure-ad-oauth2";
import accountProvisioner from "../commands/accountProvisioner";
import env from "../env";
import auth from "../middlewares/authentication";
import passportMiddleware from "../middlewares/passport";
import { StateStore } from "../utils/passport";

const router = new Router();
const providerName = "azure";
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

const scopes = [];

export const config = {
  name: "Office 365",
  enabled: !!AZURE_CLIENT_ID,
};

if (AZURE_CLIENT_ID) {
  const strategy = new AzureStrategy(
    {
      clientID: AZURE_CLIENT_ID,
      clientSecret: AZURE_CLIENT_SECRET,
      callbackURL: `${env.URL}/auth/azure.callback`,
      useCommonEndpoint: true,
      passReqToCallback: true,
      store: new StateStore(),
      scope: scopes,
    },
    async function (req, accessToken, refreshToken, params, _, done) {
      try {
        // see docs for what the fields in profile represent here:
        // https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens
        const profile = jwt.decode(params.id_token);

        const domain = profile.email.split("@")[1];
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
            name: profile.name,
            email: profile.email,
            avatarUrl: profile.picture,
          },
          authenticationProvider: {
            name: providerName,
            providerId: profile.tid,
          },
          authentication: {
            providerId: profile.oid,
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

  strategy.name = providerName;
  passport.use(strategy);

  router.get("azure", passport.authenticate(providerName));

  router.get(
    "azure.callback",
    auth({ required: false }),
    passportMiddleware(providerName)
  );
}

export default router;
