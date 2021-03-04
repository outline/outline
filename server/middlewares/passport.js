// @flow
import passport from "passport";
import { EmailAuthenticationRequiredError } from "../errors";
import { User, Team } from "../models";

export default function createMiddleware(providerName: string) {
  return function passportMiddleware(ctx) {
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
