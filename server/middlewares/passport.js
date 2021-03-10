// @flow
import passport from "@outlinewiki/koa-passport";
import type { AccountProvisionerResult } from "../commands/accountProvisioner";
import type { ContextWithAuthMiddleware } from "../types";

export default function createMiddleware(providerName: string) {
  return function passportMiddleware(ctx: ContextWithAuthMiddleware) {
    return passport.authorize(
      providerName,
      { session: false },
      (err, _, result: AccountProvisionerResult) => {
        if (err) {
          if (err.id) {
            console.error(err);
            const notice = err.id.replace(/_/g, "-");
            return ctx.redirect(`${err.redirectUrl || "/"}?notice=${notice}`);
          }

          if (process.env.NODE_ENV === "development") {
            throw err;
          }
          return ctx.redirect(`/?notice=auth-error`);
        }

        if (result.user.isSuspended) {
          return ctx.redirect("/?notice=suspended");
        }

        ctx.signIn(result.user, result.team, providerName, result.isNewUser);
      }
    )(ctx);
  };
}
