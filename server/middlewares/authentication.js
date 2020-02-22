// @flow
import JWT from 'jsonwebtoken';
import { type Context } from 'koa';
import passport from 'koa-passport';
import { User, ApiKey } from '../models';
import { AuthenticationError, UserSuspendedError } from '../errors';

/**
 * secureUserFromToken decodes the given token, looks up the user
 * and verifies using the user's jwtSecret.
 * @throws {AuthenticationError} Only AuthenticationError can be thrown,
 * which is save to be thrown inside a koa handler to be handled in the
 * error handler.
 */
async function secureUserFromToken(token: string): User {
  let payload: ?{ id?: string };
  try {
    payload = JWT.decode(token);
  } catch (e) {
    throw new AuthenticationError('Unable to decode JWT token');
  }

  if (!payload) {
    throw new AuthenticationError('Invalid token');
  }

  const user = await User.findById(payload.id);
  try {
    JWT.verify(token, user.jwtSecret);
  } catch (e) {
    throw new AuthenticationError('Invalid token');
  }

  return user;
}

passport.serializeUser(async function(user: User, done: Function) {
  done(null, user.getJwtToken());
});
passport.deserializeUser(async function(token: string, done: Function) {
  let user;
  try {
    user = await secureUserFromToken(token);
  } catch (e) {
    return done(e);
  }

  done(null, user);
});

export default function auth(options?: { required?: boolean } = {}) {
  return async function authMiddleware(ctx: Context, next: () => Promise<*>) {
    let token;

    const authorizationHeader = ctx.request.get('authorization');
    if (authorizationHeader) {
      const parts = authorizationHeader.split(' ');
      if (parts.length === 2) {
        const scheme = parts[0];
        const credentials = parts[1];

        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        throw new AuthenticationError(
          `Bad Authorization header format. Format is "Authorization: Bearer <token>"`
        );
      }
      // $FlowFixMe
    } else if (ctx.body && ctx.body.token) {
      token = ctx.body.token;
    } else if (ctx.request.query.token) {
      token = ctx.request.query.token;
    } else if (ctx.cookies.get('accessToken')) {
      token = ctx.cookies.get('accessToken');
    }

    if (!token && options.required !== false) {
      throw new AuthenticationError('Authentication required');
    }

    let user;
    if (token) {
      if (String(token).match(/^[\w]{38}$/)) {
        // API key
        let apiKey;
        try {
          apiKey = await ApiKey.findOne({
            where: {
              secret: token,
            },
          });
        } catch (e) {
          throw new AuthenticationError('Invalid API key');
        }

        if (!apiKey) throw new AuthenticationError('Invalid API key');

        user = await User.findById(apiKey.userId);
        if (!user) throw new AuthenticationError('Invalid API key');
      } else {
        // JWT Token

        // save to be called without try-catch as
        // it can only throw an AuthorizationError
        // which is handled correctly in the error
        // handler
        user = await secureUserFromToken(token);
      }

      if (user.isSuspended) {
        const suspendingAdmin = await User.findById(user.suspendedById);
        throw new UserSuspendedError({ adminEmail: suspendingAdmin.email });
      }

      // not awaiting the promise here so that the request is not blocked
      user.updateActiveAt(ctx.request.ip);

      ctx.state.token = token;
      ctx.state.user = user;
      if (!ctx.cache) ctx.cache = {};
      ctx.cache[user.id] = user;
    }

    return next();
  };
}

// Export JWT methods as a convenience
export const sign = JWT.sign;
export const verify = JWT.verify;
export const decode = JWT.decode;
