import { Next } from "koa";
import Logger from "@server/logging/Logger";
import tracer, {
  addTags,
  getRootSpanFromRequestContext,
} from "@server/logging/tracer";
import { User, Team, ApiKey } from "@server/models";
import { AppContext, AuthenticationType } from "@server/types";
import { getUserForJWT } from "@server/utils/jwt";
import {
  AuthenticationError,
  AuthorizationError,
  UserSuspendedError,
} from "../errors";

type AuthenticationOptions = {
  /** An admin user role is required to access the route */
  admin?: boolean;
  /** A member or admin user role is required to access the route */
  member?: boolean;
  /**
   * Authentication is parsed, but optional. Note that if a token is provided
   * in the request it must be valid or the requst will be rejected.
   */
  optional?: boolean;
};

export default function auth(options: AuthenticationOptions = {}) {
  return async function authMiddleware(ctx: AppContext, next: Next) {
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
        throw AuthenticationError(
          `Bad Authorization header format. Format is "Authorization: Bearer <token>"`
        );
      }
    } else if (
      ctx.request.body &&
      typeof ctx.request.body === "object" &&
      "token" in ctx.request.body
    ) {
      token = ctx.request.body.token;
    } else if (ctx.request.query?.token) {
      token = ctx.request.query.token;
    } else {
      token = ctx.cookies.get("accessToken");
    }

    if (!token && options.optional !== true) {
      throw AuthenticationError("Authentication required");
    }

    let user: User | null;
    let type: AuthenticationType;

    if (token) {
      if (ApiKey.match(String(token))) {
        type = AuthenticationType.API;
        let apiKey;

        try {
          apiKey = await ApiKey.findOne({
            where: {
              secret: token,
            },
          });
        } catch (err) {
          throw AuthenticationError("Invalid API key");
        }

        if (!apiKey) {
          throw AuthenticationError("Invalid API key");
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
          throw AuthenticationError("Invalid API key");
        }
      } else {
        type = AuthenticationType.APP;
        user = await getUserForJWT(String(token));
      }

      if (user.isSuspended) {
        const suspendingAdmin = await User.findOne({
          where: {
            id: user.suspendedById,
          },
          paranoid: false,
        });
        throw UserSuspendedError({
          adminEmail: suspendingAdmin?.email || undefined,
        });
      }

      if (options.admin) {
        if (!user.isAdmin) {
          throw AuthorizationError("Admin role required");
        }
      }

      if (options.member) {
        if (user.isViewer) {
          throw AuthorizationError("Member role required");
        }
      }

      // not awaiting the promise here so that the request is not blocked
      user.updateActiveAt(ctx).catch((err) => {
        Logger.error("Failed to update user activeAt", err);
      });

      ctx.state.auth = {
        user,
        token: String(token),
        type,
      };

      if (tracer) {
        addTags(
          {
            "request.userId": user.id,
            "request.teamId": user.teamId,
            "request.authType": type,
          },
          getRootSpanFromRequestContext(ctx)
        );
      }
    } else {
      ctx.state.auth = {};
    }

    return next();
  };
}
