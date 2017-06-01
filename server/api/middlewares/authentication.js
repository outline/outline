import httpErrors from 'http-errors';
import JWT from 'jsonwebtoken';

import { User, ApiKey } from '../../models';

export default function auth({ require = true } = {}) {
  return async function authMiddleware(ctx, next) {
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
        if (require) {
          throw httpErrors.Unauthorized(
            `Bad Authorization header format. \
            Format is "Authorization: Bearer <token>"\n`
          );
        }
      }
    } else if (ctx.body.token) {
      token = ctx.body.token;
    } else if (ctx.request.query.token) {
      token = ctx.request.query.token;
    }

    if (!token && require) {
      throw httpErrors.Unauthorized('Authentication required');
    }

    if (token) {
      let user;

      if (token.match(/^[\w]{38}$/)) {
        // API key
        let apiKey;
        try {
          apiKey = await ApiKey.findOne({
            where: {
              secret: token,
            },
          });
        } catch (e) {
          throw httpErrors.Unauthorized('Invalid API key');
        }

        if (!apiKey) throw httpErrors.Unauthorized('Invalid token');

        user = await User.findOne({
          where: { id: apiKey.userId },
        });

        if (!user) throw httpErrors.Unauthorized('Invalid token');
      } else {
        // JWT
        // Get user without verifying payload signature
        let payload;
        try {
          payload = JWT.decode(token);
        } catch (e) {
          throw httpErrors.Unauthorized('Unable to decode JWT token');
        }

        if (!payload) throw httpErrors.Unauthorized('Invalid token');

        user = await User.findOne({
          where: { id: payload.id },
        });

        try {
          JWT.verify(token, user.jwtSecret);
        } catch (e) {
          throw httpErrors.Unauthorized('Invalid token');
        }
      }

      ctx.state.token = token;
      ctx.state.user = user;
      ctx.cache[user.id] = user;
    }

    return next();
  };
}

// Export JWT methods as a convenience
export const sign = JWT.sign;
export const verify = JWT.verify;
export const decode = JWT.decode;
