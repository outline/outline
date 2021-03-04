// @flow
import passport from "passport";
import { User, Team } from "../models";
import type { ContextWithAuthMiddleware } from "../types";

export default function createMiddleware(providerName: string) {
  return function passportMiddleware(ctx: ContextWithAuthMiddleware) {
    return passport.authorize(
      providerName,
      { session: false },
      (
        err,
        _,
        result: {
          user: User,
          team: Team,
          isFirstSignin: boolean,
          isFirstUser: boolean,
        }
      ) => {
        if (err) {
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

        ctx.signIn(
          result.user,
          result.team,
          providerName,
          result.isFirstSignin
        );
      }
    )(ctx);
  };
}
