import httpErrors from 'http-errors';
import JWT from 'jsonwebtoken';

import { User } from '../models';

export default function auth({ require = true } = {}) {
  return async function authMiddleware(ctx, next) {
    let token;

    const authorizationHeader = ctx.request.get('authorization');
    if (authorizationHeader) {
      const parts = authorizationHeader.split(' ');
      if (parts.length == 2) {
        const scheme = parts[0];
        const credentials = parts[1];

        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        if (require) {
          throw httpErrors.Unauthorized('Bad Authorization header format. Format is "Authorization: Bearer <token>"\n');
        }
      }
    } else if (ctx.request.query.token) {
      token = ctx.request.query.token;
    }

    if (!token && require) {
      throw httpErrors.Unauthorized('Authentication required');
    }

    if (token && require) {
      // Get user without verifying payload signature
      let payload;
      try {
        payload = JWT.decode(token);
      } catch(_e) {
        throw httpErrors.Unauthorized('Unable to decode JWT token');
      }
      const user = await User.findOne({
        where: { id: payload.id },
      });

      try {
        JWT.verify(token, user.jwtSecret);
      } catch(e) {
        throw httpErrors.Unauthorized('Invalid token');
      }

      ctx.state.token = token;
      ctx.state.user = user;
    }

    return next();
  };
};

// Export JWT methods as a convenience
export const sign   = JWT.sign;
export const verify = JWT.verify;
export const decode = JWT.decode;
