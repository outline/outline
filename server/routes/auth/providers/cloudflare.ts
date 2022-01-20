// @flow
import passport from "@outlinewiki/koa-passport";
import Router from "koa-router";

import { Strategy as CloudflareStrategy } from "passport-cloudflare";

import accountProvisioner from "../../../commands/accountProvisioner";
import passportMiddleware from "../../../middlewares/passport";

const router = new Router();

const providerName = "cloudflare";

const audienceId = process.env.CLOUDFLARE_AUDIENCE;
const teamName = process.env.CLOUDFLARE_TEAM_NAME;
const displayName = process.env.CLOUDFLARE_TEAM_DISPLAY_NAME || teamName;
const teamDomainName = `${teamName}.cloudflareaccess.com`;

const providerEnabled = !!teamName && !!audienceId;
const scopes = [];

export const config = {
  name: providerName,
  enabled: providerEnabled,
};

const strategy = new CloudflareStrategy(
  {
    teamName: teamName,
    audience: audienceId,

    verifyAudience: true,
    verifyIssuer: true,

    passReqToCallback: true,
  },
  async function (req, response, done) {
    try {
      const { identity } = response;

      const result = await accountProvisioner({
        ip: identity.ip,
        team: {
          name: displayName,
          domain: teamDomainName,
          subdomain: teamName,
        },
        user: {
          name: identity.name,
          email: identity.email,
        },
        authenticationProvider: {
          name: providerName,
          providerId: teamDomainName,
        },
        authentication: {
          providerId: identity.id,
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

router.get(providerName, passportMiddleware(providerName));

export default router;
