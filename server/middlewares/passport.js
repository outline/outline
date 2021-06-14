// @flow
import passport from "@outlinewiki/koa-passport";
import { type Context } from "koa";
import type { AccountProvisionerResult } from "../commands/accountProvisioner";
import { signIn } from "../utils/authentication";

export default function createMiddleware(providerName: string) {
  return function passportMiddleware(ctx: Context) {
    return passport.authorize(
      providerName,
      { session: false },
      async (err, _, result: AccountProvisionerResult) => {
        if (err) {
          console.error(err);

          if (err.id) {
            const notice = err.id.replace(/_/g, "-");
            return ctx.redirect(`${err.redirectUrl || "/"}?notice=${notice}`);
          }

          if (process.env.NODE_ENV === "development") {
            throw err;
          }
          return ctx.redirect(`/?notice=auth-error`);
        }

        // Handle errors from Azure which come in the format: message, Trace ID,
        // Correlation ID, Timestamp in these two query string parameters.
        const { error, error_description } = ctx.request.query;
        if (error && error_description) {
          console.error(error_description);

          // Display only the descriptive message to the user, log the rest
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
