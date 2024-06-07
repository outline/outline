import passport from "@outlinewiki/koa-passport";
import type { Context } from "koa";
import Router from "koa-router";
import capitalize from "lodash/capitalize";
import { Profile, Strategy as DiscordStrategy } from "passport-discord";

import { languages } from "@shared/i18n";
import { slugifyDomain } from "@shared/utils/domains";
import accountProvisioner from "@server/commands/accountProvisioner";
import {
  DiscordGuildError,
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
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";

const router = new Router();

const scopes = ["identify" as const, "email" as const];

const scopesWithGuilds = [...scopes, "guilds" as const];

if (env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        passReqToCallback: true,
        scope: env.DISCORD_SERVER_ID ? scopesWithGuilds : scopes,
        // @ts-expect-error custom state store
        store: new StateStore(),
        state: true,
        callbackURL: `${env.URL}/auth/${config.id}.callback`,
      },
      function (
        ctx: Context,
        accessToken: string,
        refreshToken: string,
        params: { expires_in: number },
        profile: Profile,
        done: (
          err: Error | null,
          user: User | null,
          result?: AuthenticationResult
        ) => void
      ) {
        async () => {
          try {
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

            if (
              env.DISCORD_SERVER_ID &&
              !profile.guilds?.find((g) => g.id === env.DISCORD_SERVER_ID)
            ) {
              throw DiscordGuildError();
            }

            // remove the TLD and form a subdomain from the remaining
            const subdomain = slugifyDomain(domain);

            const teamName = capitalize(subdomain);

            const avatarHash = profile.avatar;
            const avatarUrl = `https://cdn.discordapp.com/avatars/${profile.id}/${avatarHash}.png`;
            const locale = profile.locale;
            const language = profile.locale
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
              },
              user: {
                email,
                name: profile.displayName,
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
        };
      }
    )
  );

  router.get(
    config.id,
    passport.authenticate(config.id, {
      accessType: "offline",
      prompt: "select_account consent",
    })
  );
  router.get(`${config.id}.callback`, passportMiddleware(config.id));
}

export default router;
