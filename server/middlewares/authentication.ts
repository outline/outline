import { User, Team, ApiKey } from "@server/models";
import { getUserForJWT } from "@server/utils/jwt";
import { AuthenticationError, UserSuspendedError } from "../errors";
import { ContextWithState } from "../types";

export default function auth(
  options: {
    required?: boolean;
  } = {}
) {
  return async function authMiddleware(
    ctx: ContextWithState,
    next: () => Promise<unknown>
  ) {
    let token;
    const authorizationHeader = ctx.request.get("authorization");

    if (authorizationHeader) {
      const parts = authorizationHeader.split(" ");

      if (parts.length === 2) {
        const scheme = parts[0];
        const credentials = parts[1];

        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new AuthenticationError(
          `Bad Authorization header format. Format is "Authorization: Bearer <token>"`
        );
      }
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
    } else if (ctx.body && ctx.body.token) {
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      token = ctx.body.token;
    } else if (ctx.request.query.token) {
      token = ctx.request.query.token;
    } else {
      token = ctx.cookies.get("accessToken");
    }

    if (!token && options.required !== false) {
      // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
      throw new AuthenticationError("Authentication required");
    }

    let user;

    if (token) {
      if (String(token).match(/^[\w]{38}$/)) {
        ctx.state.authType = "api";
        let apiKey;

        try {
          apiKey = await ApiKey.findOne({
            where: {
              secret: token,
            },
          });
        } catch (err) {
          // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
          throw new AuthenticationError("Invalid API key");
        }

        if (!apiKey) {
          // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
          throw new AuthenticationError("Invalid API key");
        }

        user = await User.findByPk(apiKey.userId, {
          include: [
            {
              model: Team,
              as: "team",
              required: true,
            },
          ],
        });

        if (!user) {
          // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
          throw new AuthenticationError("Invalid API key");
        }
      } else {
        ctx.state.authType = "app";
        user = await getUserForJWT(String(token));
      }

      if (user.isSuspended) {
        const suspendingAdmin = await User.findOne({
          where: {
            id: user.suspendedById,
          },
          paranoid: false,
        });
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new UserSuspendedError({
          adminEmail: suspendingAdmin.email,
        });
      }

      // not awaiting the promise here so that the request is not blocked
      user.updateActiveAt(ctx.request.ip);
      ctx.state.token = String(token);
      ctx.state.user = user;
    }

    return next();
  };
}
