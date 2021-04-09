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
      (err, _, result: AccountProvisionerResult) => {
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

        if (result.user.isSuspended) {
          return ctx.redirect("/?notice=suspended");
        }

        signIn(ctx, result.user, result.team, providerName, result.isNewUser);
      }
    )(ctx);
  };
}
