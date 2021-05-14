// @flow
import passport from "@outlinewiki/koa-passport";
import Router from "koa-router";
//import { capitalize } from "lodash";
import { Strategy as GiteaStrategy } from "passport-gitea";
import accountProvisioner from "../../commands/accountProvisioner";
import env from "../../env";
import {
  GiteaOrganizationError,
  GiteaOrganizationAPIError,
} from "../../errors";
import passportMiddleware from "../../middlewares/passport";
//import { getAllowedDomains } from "../../utils/authentication";
import { StateStore } from "../../utils/passport";

const router = new Router();
const providerName = "gitea";
const GITEA_CLIENT_ID = process.env.GITEA_CLIENT_ID;
const GITEA_CLIENT_SECRET = process.env.GITEA_CLIENT_SECRET;
const GITEA_URL = process.env.GITEA_URL; //Usage of custom url
//const allowedDomains = getAllowedDomains();

const scopes = [];

export const config = {
  name: "Gitea",
  enabled: !!GITEA_CLIENT_ID,
};

export async function request(endpoint: string, accessToken: string) {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

if (GITEA_CLIENT_ID) {
  let strategyOptions = {
    clientID: GITEA_CLIENT_ID,
    clientSecret: GITEA_CLIENT_SECRET,
    passReqToCallback: true,
    callbackURL: `${env.URL}/auth/gitea.callback`,
    store: new StateStore(),
    scope: scopes,
  };

  //When using a user installed Gitea instance
  if (GITEA_URL) {
    strategyOptions["authorizationURL"] = `${GITEA_URL}/login/oauth/authorize`;
    strategyOptions["tokenURL"] = `${GITEA_URL}/login/oauth/access_token`;
    strategyOptions["userProfileURL"] = `${GITEA_URL}/api/v1/user`;
  }

  passport.use(
    new GiteaStrategy(strategyOptions, async function (
      req,
      accessToken,
      refreshToken,
      profile,
      done
    ) {
      try {
        //Fetch users Organisations
        const organizationResponse = await request(
          `${GITEA_URL}/api/v1/user/orgs`,
          accessToken
        );
        if (!organizationResponse) {
          throw new GiteaOrganizationAPIError();
        }

        if (!organizationResponse.length) {
          throw new GiteaOrganizationError();
        }

        const organization = organizationResponse[0];

        if (organization.website === "") {
          throw new GiteaOrganizationError();
        }
        //Remove protocol
        //Maybe even remove (www) from the url so the subdomain
        const domain = organization.website.replace(/(^\w+:|^)\/\//, "");

        const subdomain = domain.split(".")[0];
        const teamName = organization.username;

        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            name: teamName,
            domain,
            subdomain,
          },
          user: {
            name: profile._json.login,
            email: profile._json.email,
            avatarUrl: profile._json.avatar_url,
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
    })
  );

  router.get("gitea", passport.authenticate(providerName));

  router.get("gitea.callback", passportMiddleware(providerName));
}

export default router;
