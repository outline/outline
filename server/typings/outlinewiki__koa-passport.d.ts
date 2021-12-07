declare module "@outlinewiki/koa-passport" {
  // Type definitions for Passport 1.0
  // Project: http://passportjs.org
  // Definitions by: Horiuchi_H <https://github.com/horiuchi>
  //                 Eric Naeseth <https://github.com/enaeseth>
  //                 Igor Belagorudsky <https://github.com/theigor>
  //                 Tomek Łaziuk <https://github.com/tlaziuk>
  //                 Daniel Perez Alvarez <https://github.com/unindented>
  //                 Kevin Stiehl <https://github.com/kstiehl>
  //                 Oleg Vaskevich <https://github.com/vaskevich>
  // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
  // TypeScript Version: 2.3

  import { IncomingMessage } from "http";
  // eslint-disable-next-line
  import Express from "express";
  import { Request } from "koa";
  import { IMiddleware } from "koa-router";

  namespace passport {
    interface AuthenticateOptions {
      authInfo?: boolean | undefined;
      assignProperty?: string | undefined;
      failureFlash?: string | boolean | undefined;
      failureMessage?: boolean | string | undefined;
      failureRedirect?: string | undefined;
      failWithError?: boolean | undefined;
      session?: boolean | undefined;
      scope?: string | string[] | undefined;
      successFlash?: string | boolean | undefined;
      successMessage?: boolean | string | undefined;
      successRedirect?: string | undefined;
      successReturnToOrRedirect?: string | undefined;
      state?: string | undefined;
      pauseStream?: boolean | undefined;
      userProperty?: string | undefined;
      passReqToCallback?: boolean | undefined;
      prompt?: string | undefined;
      accessType?: string | undefined;
    }

    interface Authenticator<
      InitializeRet = IMiddleware,
      AuthenticateRet = any,
      AuthorizeRet = AuthenticateRet,
      AuthorizeOptions = AuthenticateOptions
    > {
      use(strategy: Strategy): this;
      use(name: string, strategy: Strategy): this;
      unuse(name: string): this;
      framework<X, Y, Z>(fw: Framework<X, Y, Z>): Authenticator<X, Y, Z>;
      initialize(options?: { userProperty: string }): InitializeRet;
      session(options?: { pauseStream: boolean }): AuthenticateRet;

      authenticate(
        strategy: string | string[] | Strategy,
        callback?: (...args: any[]) => any
      ): AuthenticateRet;
      authenticate(
        strategy: string | string[] | Strategy,
        options: AuthenticateOptions,
        callback?: (...args: any[]) => any
      ): AuthenticateRet;
      authorize(
        strategy: string | string[],
        callback?: (...args: any[]) => any
      ): AuthorizeRet;
      authorize(
        strategy: string | string[],
        options: AuthorizeOptions,
        callback?: (...args: any[]) => any
      ): AuthorizeRet;
      serializeUser<TID>(
        fn: (user: any, done: (err: any, id?: TID) => void) => void
      ): void;
      serializeUser<TID, TR extends IncomingMessage>(
        fn: (req: TR, user: any, done: (err: any, id?: TID) => void) => void
      ): void;
      deserializeUser<TID>(
        fn: (id: TID, done: (err: any, user?: any) => void) => void
      ): void;
      deserializeUser<TID, TR extends IncomingMessage>(
        fn: (req: TR, id: TID, done: (err: any, user?: any) => void) => void
      ): void;
      transformAuthInfo(
        fn: (info: any, done: (err: any, info: any) => void) => void
      ): void;
    }

    interface PassportStatic extends Authenticator {
      Authenticator: { new (): Authenticator };
      Passport: PassportStatic["Authenticator"];
      Strategy: { new (): Strategy & StrategyCreatedStatic };
    }

    interface Strategy {
      name?: string | undefined;
      authenticate(
        this: StrategyCreated<this>,
        req: Request | Express.Request,
        options?: any
      ): any;
    }

    interface StrategyCreatedStatic {
      /**
       * Authenticate `user`, with optional `info`.
       *
       * Strategies should call this function to successfully authenticate a
       * user.  `user` should be an object supplied by the application after it
       * has been given an opportunity to verify credentials.  `info` is an
       * optional argument containing additional user information.  This is
       * useful for third-party authentication strategies to pass profile
       * details.
       */
      success(user: any, info?: object): void;
      /**
       * Fail authentication, with optional `challenge` and `status`, defaulting
       * to 401.
       *
       * Strategies should call this function to fail an authentication attempt.
       */
      fail(challenge?: string | number, status?: number): void;
      /**
       * Redirect to `url` with optional `status`, defaulting to 302.
       *
       * Strategies should call this function to redirect the user (via their
       * user agent) to a third-party website for authentication.
       */
      redirect(url: string, status?: number): void;
      /**
       * Pass without making a success or fail decision.
       *
       * Under most circumstances, Strategies should not need to call this
       * function.  It exists primarily to allow previous authentication state
       * to be restored, for example from an HTTP session.
       */
      pass(): void;
      /**
       * Internal error while performing authentication.
       *
       * Strategies should call this function when an internal error occurs
       * during the process of performing authentication; for example, if the
       * user directory is not available.
       */
      error(err: any): void;
    }

    type StrategyCreated<T, O = T & StrategyCreatedStatic> = {
      [P in keyof O]: O[P];
    };

    interface Profile {
      provider: string;
      id: string;
      displayName: string;
      username?: string | undefined;
      name?:
        | {
            familyName: string;
            givenName: string;
            middleName?: string | undefined;
          }
        | undefined;
      emails?:
        | Array<{
            value: string;
            type?: string | undefined;
          }>
        | undefined;
      photos?:
        | Array<{
            value: string;
          }>
        | undefined;
    }

    interface Framework<
      InitializeRet = any,
      AuthenticateRet = any,
      AuthorizeRet = AuthenticateRet
    > {
      initialize(
        passport: Authenticator<InitializeRet, AuthenticateRet, AuthorizeRet>,
        options?: any
      ): (...args: any[]) => InitializeRet;
      authenticate(
        passport: Authenticator<InitializeRet, AuthenticateRet, AuthorizeRet>,
        name: string,
        options?: any,
        callback?: (...args: any[]) => any
      ): (...args: any[]) => AuthenticateRet;
      authorize?(
        passport: Authenticator<InitializeRet, AuthenticateRet, AuthorizeRet>,
        name: string,
        options?: any,
        callback?: (...args: any[]) => any
      ): (...args: any[]) => AuthorizeRet;
    }
  }

  const passport: passport.PassportStatic;
  export = passport;
}
