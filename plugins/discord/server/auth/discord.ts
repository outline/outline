import passport from "@outlinewiki/koa-passport";
import {
  RESTGetAPICurrentUserGuildsResult,
  RESTGetAPICurrentUserResult,
  RESTGetCurrentUserGuildMemberResult,
} from "discord-api-types/v10";
import type { Context } from "koa";
import Router from "koa-router";

import { Strategy } from "passport-oauth2";
import { languages } from "@shared/i18n";
import { slugifyDomain } from "@shared/utils/domains";
import slugify from "@shared/utils/slugify";
import accountProvisioner from "@server/commands/accountProvisioner";
import {
  DiscordGuildError,
  DiscordGuildRoleError,
  InvalidRequestError,
  TeamDomainRequiredError,
} from "@server/errors";
import passportMiddleware from "@server/middlewares/passport";
import { User } from "@server/models";
import { AuthenticationResult } from "@server/types";
import {
  StateStore,
  getTeamFromContext,
  getClientFromContext,
  request,
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";

const router = new Router();

const scopes = ["identify", "email"];

if (env.DISCORD_SERVER_ID) {
  scopes.push("guilds", "guilds.members.read");
}

if (env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) {
  passport.use(
    config.id,
    new Strategy(
      {
        clientID: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        passReqToCallback: true,
        scope: scopes,
        // @ts-expect-error custom state store
        store: new StateStore(),
        state: true,
        callbackURL: `${env.URL}/auth/${config.id}.callback`,
        authorizationURL: "https://discord.com/api/oauth2/authorize",
        tokenURL: "https://discord.com/api/oauth2/token",
        pkce: false,
      },
      async function (
        ctx: Context,
        accessToken: string,
        refreshToken: string,
        params: { expires_in: number },
        _profile: unknown,
        done: (
          err: Error | null,
          user: User | null,
          result?: AuthenticationResult
        ) => void
      ) {
        try {
          const profile: RESTGetAPICurrentUserResult = await request(
            "https://discord.com/api/users/@me",
            accessToken
          );
          let guilds: RESTGetAPICurrentUserGuildsResult = [];
          if (env.DISCORD_SERVER_ID) {
            guilds = await request(
              "https://discord.com/api/users/@me/guilds",
              accessToken
            );
          }
          const team = await getTeamFromContext(ctx);
          const client = getClientFromContext(ctx);
          const email = profile.email;
          if (!email) {
            throw InvalidRequestError("Discord profile email is missing");
          }
          const parts = email.toLowerCase().split("@");
          const domain = parts.length && parts[1];

          if (!domain) {
            throw TeamDomainRequiredError();
          }

          const foundGuild = guilds?.find(
            (g) => g.id === env.DISCORD_SERVER_ID
          );

          let name = profile.username;

          const teamIcon = foundGuild?.icon
            ? `https://cdn.discordapp.com/icons/${foundGuild.id}/${foundGuild.icon}.png`
            : undefined;

          if (env.DISCORD_SERVER_ID) {
            if (!foundGuild) {
              throw DiscordGuildError();
            }

            const guildId = env.DISCORD_SERVER_ID;
            const guildMember: RESTGetCurrentUserGuildMemberResult =
              await request(
                `https://discord.com/api/users/@me/guilds/${guildId}/member`,
                accessToken
              );

            if (guildMember.nick) {
              name = guildMember.nick;
            }

            if (env.DISCORD_SERVER_ROLES) {
              const { roles } = guildMember;
              const hasRole = roles?.some((role) =>
                env.DISCORD_SERVER_ROLES?.includes(role)
              );

              if (!hasRole) {
                throw DiscordGuildRoleError();
              }
            }
          }

          // remove the TLD and form a subdomain from the remaining
          const subdomain = foundGuild?.name
            ? slugify(foundGuild.name)
            : slugifyDomain(domain);

          // if a discord server is configured, use the server name as the team name
          const teamName = foundGuild?.name ?? "Wiki";

          const avatarHash = profile.avatar;
          const avatarUrl = `https://cdn.discordapp.com/avatars/${profile.id}/${avatarHash}.png`;
          const { locale } = profile;
          const language = locale
            ? languages.find((l) => l.startsWith(locale))
            : undefined;

          // if a team can be inferred, we assume the user is only interested in signing into
          // that team in particular; otherwise, we will do a best effort at finding their account
          // or provisioning a new one (within AccountProvisioner)
          const result = await accountProvisioner({
            ip: ctx.ip,
            team: {
              teamId: team?.id,
              name: teamName,
              domain,
              subdomain,
              avatarUrl: teamIcon,
            },
            user: {
              email,
              name,
              language,
              avatarUrl,
            },
            authenticationProvider: {
              name: config.id,
              providerId: domain ?? "",
            },
            authentication: {
              providerId: profile.id,
              accessToken,
              refreshToken,
              expiresIn: params.expires_in,
              scopes,
            },
          });
          return done(null, result.user, { ...result, client });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  router.get(
    config.id,
    passport.authenticate(config.id, {
      scope: scopes,
      prompt: "consent",
    })
  );
  router.get(`${config.id}.callback`, passportMiddleware(config.id));
}

export default router;
