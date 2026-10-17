import passport from "@outlinewiki/koa-passport";
import type { Request } from "koa";
import Router from "@koa/router";
import type { Profile } from "passport";
import { Strategy as SlackStrategy } from "passport-slack-oauth2";
import { toError } from "@shared/utils/error";
import accountProvisioner from "@server/commands/accountProvisioner";
import passportMiddleware from "@server/middlewares/passport";
import type { User } from "@server/models";
import type { AuthenticationResult } from "@server/types";
import {
  getClientFromOAuthState,
  getTeamFromContext,
  getUserFromOAuthState,
  StateStore,
  startOAuthFlow,
  withProxyAgent,
} from "@server/utils/passport";
import { parseEmail } from "@shared/utils/email";
import env from "../env";
import { SlackUtils } from "plugins/slack/shared/SlackUtils";
import { createContext } from "@server/context";

type SlackProfile = Profile & {
  team: {
    id: string;
    name: string;
    domain: string;
    image_192: string;
    image_230: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image_192: string;
    image_230: string;
  };
};

const router = new Router();
const providerName = "slack";
const scopes = [
  "identity.email",
  "identity.basic",
  "identity.avatar",
  "identity.team",
];

if (env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET) {
  const strategy = new SlackStrategy(
    {
      clientID: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      callbackURL: SlackUtils.callbackUrl(),
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
      profile: SlackProfile,
      done: (
        err: Error | null,
        user: User | null,
        result?: AuthenticationResult
      ) => void
    ) {
      const context = req.ctx;
      try {
        const team = await getTeamFromContext(context);
        const client = getClientFromOAuthState(context);
        const user =
          context.state?.auth?.user ?? (await getUserFromOAuthState(context));

        const { domain } = parseEmail(profile.user.email);

        const ctx = createContext({
          ip: context.ip,
          user,
          authType: context.state?.auth?.type,
        });
        const result = await accountProvisioner(ctx, {
          team: {
            teamId: team?.id,
            name: profile.team.name,
            domain,
            subdomain: profile.team.domain,
            avatarUrl: profile.team.image_230,
          },
          user: {
            name: profile.user.name,
            email: profile.user.email,
            // Slack only returns confirmed workspace email addresses.
            emailVerified: true,
            avatarUrl: profile.user.image_192,
          },
          authenticationProvider: {
            name: providerName,
            providerId: profile.team.id,
          },
          authentication: {
            providerId: profile.user.id,
            accessToken,
            refreshToken,
            expiresIn: params.expires_in,
            scopes,
          },
        });
        return done(null, result.user, { ...result, client });
      } catch (err) {
        return done(toError(err), null);
      }
    }
  );
  // For some reason the author made the strategy name capatilised, I don't know
  // why but we need everything lowercase so we just monkey-patch it here.
  strategy.name = providerName;
  passport.use(withProxyAgent(strategy));

  router.get("slack", startOAuthFlow, passport.authenticate(providerName));
  router.get("slack.callback", passportMiddleware(providerName));
}

export default router;
