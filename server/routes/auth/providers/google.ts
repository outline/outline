import passport from "@outlinewiki/koa-passport";
import type { Request } from "express";
import Router from "koa-router";
import { capitalize } from "lodash";
import { Profile } from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { parseDomain } from "@shared/utils/domains";
import accountProvisioner, {
  AccountProvisionerResult,
} from "@server/commands/accountProvisioner";
import env from "@server/env";
import { InviteRequiredError, TeamDomainRequiredError } from "@server/errors";
import passportMiddleware from "@server/middlewares/passport";
import { Team, User } from "@server/models";
import { StateStore, parseState } from "@server/utils/passport";

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
        params: { expires_in: number },
        profile: GoogleProfile,
        done: (
          err: Error | null,
          user: User | null,
          result?: AccountProvisionerResult
        ) => void
      ) {
        try {
          const state = req.cookies.get("state");
          const host = state ? parseState(state).host : req.hostname;
          // appDomain is the domain the user originated from when attempting auth
          const appDomain = parseDomain(host);

          let result;
          const domain = profile._json.hd;

          // Existence of domain means this is a Google Workspaces account
          // so we'll attempt to provision an account (team and user)
          if (domain) {
            const subdomain = domain.split(".")[0];
            const teamName = capitalize(subdomain);

            result = await accountProvisioner({
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
                expiresIn: params.expires_in,
                scopes,
              },
            });
          } else {
            // No domain means it's a personal Gmail account
            // We only allow sign-in to existing invites here
            let team;
            if (appDomain.custom) {
              team = await Team.findOne({ where: { domain: appDomain.host } });
            } else if (env.SUBDOMAINS_ENABLED && appDomain.teamSubdomain) {
              team = await Team.findOne({
                where: { subdomain: appDomain.teamSubdomain },
              });
            } else if (env.DEPLOYMENT !== "hosted") {
              team = await Team.findOne();
            }

            if (!team) {
              throw TeamDomainRequiredError();
            }

            const user = await User.findOne({
              where: { teamId: team.id, email: profile.email.toLowerCase() },
            });

            if (!user) {
              throw InviteRequiredError();
            }

            await user.update({
              lastActiveAt: new Date(),
            });

            result = {
              user,
              team,
              isNewUser: false,
              isNewTeam: false,
            };
          }

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
