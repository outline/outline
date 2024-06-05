import passport from "@outlinewiki/koa-passport";
import { Context } from "koa";
import { InternalOAuthError } from "passport-oauth2";
import { Client } from "@shared/types";
import env from "@server/env";
import { AuthenticationError, OAuthStateMismatchError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { AuthenticationResult } from "@server/types";
import { signIn } from "@server/utils/authentication";
import { parseState } from "@server/utils/passport";

export default function createMiddleware(providerName: string) {
  return function passportMiddleware(ctx: Context) {
    return passport.authorize(
      providerName,
      {
        session: false,
      },
      async (err, user, result: AuthenticationResult) => {
        if (err) {
          Logger.error(
            "Error during authentication",
            err instanceof InternalOAuthError ? err.oauthError : err
          );

          if (err.id) {
            const notice = err.id.replace(/_/g, "-");
            const redirectPath = err.redirectPath ?? "/";
            const hasQueryString = redirectPath?.includes("?");

            // Every authentication action is routed through the apex domain.
            // But when there is an error, we want to redirect the user on the
            // same domain or subdomain that they originated from (found in state).

            // get original host
            const stateString = ctx.cookies.get("state");
            const state = stateString ? parseState(stateString) : undefined;

            // form a URL object with the err.redirectPath and replace the host
            const reqProtocol =
              state?.client === Client.Desktop ? "outline" : ctx.protocol;

            // `state.host` cannot be trusted if the error is a state mismatch, use `ctx.hostname`
            const requestHost =
              err instanceof OAuthStateMismatchError
                ? ctx.hostname
                : state?.host ?? ctx.hostname;
            const url = new URL(
              env.isCloudHosted
                ? `${reqProtocol}://${requestHost}${redirectPath}`
                : `${env.URL}${redirectPath}`
            );

            return ctx.redirect(
              `${url.toString()}${hasQueryString ? "&" : "?"}notice=${notice}`
            );
          }

          if (env.isDevelopment) {
            throw err;
          }

          return ctx.redirect(`/?notice=auth-error`);
        }

        // Passport.js may invoke this callback with err=null and user=null in
        // the event that error=access_denied is received from the OAuth server.
        // I'm not sure why this exception to the rule exists, but it does:
        // https://github.com/jaredhanson/passport-oauth2/blob/e20f26aad60ed54f0e7952928cbb64979ef8da2b/lib/strategy.js#L135
        if (!user && !result?.user) {
          Logger.error(
            "No user returned during authentication",
            AuthenticationError()
          );
          return ctx.redirect(`/?notice=auth-error`);
        }

        // Handle errors from Azure which come in the format: message, Trace ID,
        // Correlation ID, Timestamp in these two query string parameters.
        const { error, error_description } = ctx.request.query;

        if (error && error_description) {
          Logger.error(
            "Error from Azure during authentication",
            new Error(String(error_description))
          );
          // Display only the descriptive message to the user, log the rest
          const description = String(error_description).split("Trace ID")[0];
          return ctx.redirect(`/?notice=auth-error&description=${description}`);
        }

        if (result.user.isSuspended) {
          return ctx.redirect("/?notice=user-suspended");
        }

        await signIn(ctx, providerName, result);
      }
    )(ctx);
  };
}
