// @flow
import JWT from 'jsonwebtoken';
import { type Context } from 'koa';
import { User, ApiKey } from '../../models';
import { AuthenticationError, UserSuspendedError } from '../../errors';

export default function auth(options?: { required?: boolean } = {}) {
  return async function authMiddleware(
    ctx: Context,
    next: () => Promise<void>
  ) {
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
    } else if (ctx.body.token) {
      token = ctx.body.token;
    } else if (ctx.request.query.token) {
      token = ctx.request.query.token;
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
        // JWT
        // Get user without verifying payload signature
        let payload;
        try {
          payload = JWT.decode(token);
        } catch (e) {
          throw new AuthenticationError('Unable to decode JWT token');
        }

        if (!payload) throw new AuthenticationError('Invalid token');

        user = await User.findById(payload.id);

        try {
          JWT.verify(token, user.jwtSecret);
        } catch (e) {
          throw new AuthenticationError('Invalid token');
        }
      }

      if (user.isSuspended) {
        const suspendingAdmin = await User.findById(user.suspendedById);
        throw new UserSuspendedError({ adminEmail: suspendingAdmin.email });
      }

      ctx.state.token = token;
      ctx.state.user = user;
      // $FlowFixMe
      ctx.cache[user.id] = user;
    }

    return next();
  };
}

// Export JWT methods as a convenience
export const sign = JWT.sign;
export const verify = JWT.verify;
export const decode = JWT.decode;
