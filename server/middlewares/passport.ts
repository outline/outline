import passport from "@outlinewiki/koa-passport";
import { Context } from "koa";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { signIn } from "@server/utils/authentication";
import { AccountProvisionerResult } from "../commands/accountProvisioner";

export default function createMiddleware(providerName: string) {
  return function passportMiddleware(ctx: Context) {
    return passport.authorize(
      providerName,
      {
        session: false,
      },
      async (err, user, result: AccountProvisionerResult) => {
        if (err) {
          Logger.error("Error during authentication", err);

          if (err.id) {
            const notice = err.id.replace(/_/g, "-");
            return ctx.redirect(`${err.redirectUrl || "/"}?notice=${notice}`);
          }

          if (env.ENVIRONMENT === "development") {
            throw err;
          }

          return ctx.redirect(`/?notice=auth-error`);
        }

        // Passport.js may invoke this callback with err=null and user=null in
        // the event that error=access_denied is received from the OAuth server.
        // I'm not sure why this exception to the rule exists, but it does:
        // https://github.com/jaredhanson/passport-oauth2/blob/e20f26aad60ed54f0e7952928cbb64979ef8da2b/lib/strategy.js#L135
        if (!user) {
          return ctx.redirect(`/?notice=auth-error`);
        }

        // Handle errors from Azure which come in the format: message, Trace ID,
        // Correlation ID, Timestamp in these two query string parameters.
        const { error, error_description } = ctx.request.query;

        if (error && error_description) {
          Logger.error(
            "Error from Azure during authentication",
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | string[]' is not assign... Remove this comment to see the full error message
            new Error(error_description)
          );
          // Display only the descriptive message to the user, log the rest
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'split' does not exist on type 'string | ... Remove this comment to see the full error message
          const description = error_description.split("Trace ID")[0];
          return ctx.redirect(`/?notice=auth-error&description=${description}`);
        }

        if (result.user.isSuspended) {
          return ctx.redirect("/?notice=suspended");
        }

        await signIn(
          ctx,
          result.user,
          result.team,
          providerName,
          result.isNewUser,
          result.isNewTeam
        );
      }
    )(ctx);
  };
}
