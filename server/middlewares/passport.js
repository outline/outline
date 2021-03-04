// @flow
import passport from "passport";
import { EmailAuthenticationRequiredError } from "../errors";
import type { ContextWithState } from "../types";

export default function createMiddleware(providerName: string) {
  return function passportMiddleware(ctx: ContextWithState) {
    return passport.authorize(
      providerName,
      { session: false },
      (err, profile, result) => {
        if (err instanceof EmailAuthenticationRequiredError) {
          ctx.redirect(`${err.redirectUrl}?notice=email-auth-required`);
          return;
        }

        if (err) {
          ctx.redirect(`${err.redirectUrl}?notice=auth-error`);
          return;
        }

        if (result.user.isSuspended) {
          ctx.redirect("/?notice=suspended");
          return;
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
