import passport from "@outlinewiki/koa-passport";
import type {
  RESTAPIPartialCurrentUserGuild,
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

const scope = ["identify", "email"];

if (env.DISCORD_SERVER_ID) {
  scope.push("guilds", "guilds.members.read");
}

if (env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) {
  passport.use(
    config.id,
    new Strategy(
      {
        clientID: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        passReqToCallback: true,
        scope,
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
          const team = await getTeamFromContext(ctx);
          const client = getClientFromContext(ctx);
          /** Fetch the user's profile */
          const profile: RESTGetAPICurrentUserResult = await request(
            "https://discord.com/api/users/@me",
            accessToken
          );

          const email = profile.email;
          if (!email) {
            /** We have the email scope, so this should never happen */
            throw InvalidRequestError("Discord profile email is missing");
          }
          const parts = email.toLowerCase().split("@");
          const domain = parts.length && parts[1];

          if (!domain) {
            throw TeamDomainRequiredError();
          }

          /** Determine the user's language from the locale */
          const { locale } = profile;
          const language = locale
            ? languages.find((l) => l.startsWith(locale))
            : undefined;

          let guild: RESTAPIPartialCurrentUserGuild | undefined = undefined;
          let name = profile.username;

          /**
           * If a Discord server is configured, we will check if the user is a member of the server
           * Additionally, we can get the user's nickname in the server if it exists
           */
          if (env.DISCORD_SERVER_ID) {
            /** Fetch the guilds a user is in */
            const guilds: RESTGetAPICurrentUserGuildsResult = await request(
              "https://discord.com/api/users/@me/guilds",
              accessToken
            );

            /** Find the guild that matches the configured server ID */
            guild = guilds?.find((g) => g.id === env.DISCORD_SERVER_ID);

            /** If the user is not in the server, throw an error */
            if (!guild) {
              throw DiscordGuildError();
            }

            /** Fetch the user's member object in the server for nickname and roles */
            const guildMember: RESTGetCurrentUserGuildMemberResult =
              await request(
                `https://discord.com/api/users/@me/guilds/${env.DISCORD_SERVER_ID}/member`,
                accessToken
              );

            /** If the user has a nickname in the server, use that as the name */
            if (guildMember.nick) {
              name = guildMember.nick;
            }

            /** If server roles are configured, check if the user has any of the roles */
            if (env.DISCORD_SERVER_ROLES) {
              const { roles } = guildMember;
              const hasRole = roles?.some((role) =>
                env.DISCORD_SERVER_ROLES?.includes(role)
              );

              /** If the user does not have any of the roles, throw an error */
              if (!hasRole) {
                throw DiscordGuildRoleError();
              }
            }
          }

          /** Use the guild icon as the team icon if it exists */
          const teamIcon = guild?.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
            : undefined;

          /** Determine the subdomain from the guild name or domain of email if no server */
          const subdomain = guild?.name
            ? slugify(guild.name)
            : slugifyDomain(domain);

          /** Use the guild name as the team name if it exists, otherwise default to "Wiki" */
          const teamName = guild?.name ?? "Wiki";

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
              avatarUrl: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
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
              scopes: scope,
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
      scope,
      prompt: "consent",
    })
  );
  router.get(`${config.id}.callback`, passportMiddleware(config.id));
}

export default router;
