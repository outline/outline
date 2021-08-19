// @flow
import passport from "@outlinewiki/koa-passport";
 import { Strategy as DiscordStrategy } from "passport-discord";

import fetch from "fetch-with-proxy";
import jwt from "jsonwebtoken";
import Router from "koa-router";
import accountProvisioner from "../../commands/accountProvisioner";
import env from "../../env";
import { DiscordError } from "../../errors";
import passportMiddleware from "../../middlewares/passport";
import { getAllowedDomains } from "../../utils/authentication";
import { StateStore } from "../../utils/passport";

const router = new Router();
const providerName = "discord";
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const allowedDomains = getAllowedDomains();

const scopes = ['identify', 'email', 'guilds', 'guilds.join'];

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

export const config = {
  name: "Discord",
  enabled: !!DISCORD_CLIENT_ID,
};

if (DISCORD_CLIENT_ID) {
  const strategy = new DiscordStrategy(
    {
      clientID: DISCORD_CLIENT_ID,
      clientSecret: DISCORD_CLIENT_SECRET,
      callbackURL: `${env.URL}/auth/discord.callback`,
      passReqToCallback: true,
      store: new StateStore(),
      scope: scopes,
    },
    async function (req, accessToken, refreshToken, profile, done) {
      try {
        var result = null;
  
        for (const guild of profile.guilds) {
          if (allowedDomains != null) {
            if (!allowedDomains.includes(guild.name)) {
              // console.log("Discord skipping: " + guild.name); 
              continue;
            }
          }
        
          result = await accountProvisioner({
            ip: req.ip,
            team: {
              name: guild.name,
              avatarUrl: guild.icon,
            },
            user: {
              name: profile.username,
              email: profile.email,
              avatarUrl: profile.avatar,
            },
            authenticationProvider: {
              name: providerName,
              providerId: guild.id,
            },
            authentication: {
              providerId: profile.id,
              accessToken,
              refreshToken,
              scopes,
            },
          });
        }
        done(null, result.user, result);
      } catch (err) {
        return done(err, null);
      }
    }
  );

  passport.use(strategy);

  router.get("discord", passport.authenticate(providerName));

  router.get("discord.callback", passportMiddleware(providerName));
}

export default router;
