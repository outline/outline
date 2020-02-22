// @flow
import passport from 'koa-passport';
import { type Context } from 'koa';
import { type User } from '../models';

type AuthorizeResult = {
  User: User,
  Info: string,
  Status: string,
};

/**
 * Wraps passport's authorize method and returns the authorization results
 * as awaitable Promise. authorize() does not set the user on the context.
 */
export function authorize(
  strategy: string,
  ctx: Context
): Promise<AuthorizeResult> {
  return new Promise((resolve, reject) => {
    passport.authorize(
      strategy,
      (err: Error, user: User, info: string, status: string) => {
        if (err) {
          return reject(err);
        }
        resolve({
          User: user,
          Info: info,
          Status: status,
        });
      }
    )(ctx);
  });
}
