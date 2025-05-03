import { Next } from "koa";
import capitalize from "lodash/capitalize";
import { UserRole } from "@shared/types";
import { UserRoleHelper } from "@shared/utils/UserRoleHelper";
import Logger from "@server/logging/Logger";
import tracer, {
  addTags,
  getRootSpanFromRequestContext,
} from "@server/logging/tracer";
import { User, Team, ApiKey, OAuthAuthentication } from "@server/models";
import { AppContext, AuthenticationType } from "@server/types";
import { getUserForJWT } from "@server/utils/jwt";
import {
  AuthenticationError,
  AuthorizationError,
  UserSuspendedError,
} from "../errors";

type AuthenticationOptions = {
  /** Role requuired to access the route. */
  role?: UserRole;
  /** Type of authentication required to access the route. */
  type?: AuthenticationType | AuthenticationType[];
  /** Authentication is parsed, but optional. */
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

    try {
      if (!token) {
        throw AuthenticationError("Authentication required");
      }

      let user: User | null;
      let type: AuthenticationType;

      if (OAuthAuthentication.match(String(token))) {
        if (!authorizationHeader) {
          throw AuthenticationError(
            "OAuth access token must be passed in the Authorization header"
          );
        }

        type = AuthenticationType.OAUTH;

        let authentication;
        try {
          authentication = await OAuthAuthentication.findByAccessToken(token, {
            rejectOnEmpty: true,
          });
        } catch (err) {
          throw AuthenticationError("Invalid access token");
        }
        if (!authentication) {
          throw AuthenticationError("Invalid access token");
        }
        if (authentication.accessTokenExpiresAt < new Date()) {
          throw AuthenticationError("Access token is expired");
        }
        if (!authentication.canAccess(ctx.request.url)) {
          throw AuthenticationError(
            "Access token does not have access to this resource"
          );
        }

        user = await User.findByPk(authentication.userId, {
          include: [
            {
              model: Team,
              as: "team",
              required: true,
            },
          ],
        });
        if (!user) {
          throw AuthenticationError("Invalid access token");
        }

        await authentication.updateActiveAt();
      } else if (ApiKey.match(String(token))) {
        type = AuthenticationType.API;
        let apiKey;

        try {
          apiKey = await ApiKey.findByToken(token);
        } catch (err) {
          throw AuthenticationError("Invalid API key");
        }

        if (!apiKey) {
          throw AuthenticationError("Invalid API key");
        }

        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          throw AuthenticationError("API key is expired");
        }

        if (!apiKey.canAccess(ctx.request.url)) {
          throw AuthenticationError(
            "API key does not have access to this resource"
          );
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

        await apiKey.updateActiveAt();
      } else {
        type = AuthenticationType.APP;
        user = await getUserForJWT(String(token));
      }

      if (user.isSuspended) {
        const suspendingAdmin = await User.findOne({
          where: {
            id: user.suspendedById!,
          },
          paranoid: false,
        });
        throw UserSuspendedError({
          adminEmail: suspendingAdmin?.email || undefined,
        });
      }

      if (options.role && UserRoleHelper.isRoleLower(user.role, options.role)) {
        throw AuthorizationError(`${capitalize(options.role)} role required`);
      }

      if (
        options.type &&
        (Array.isArray(options.type)
          ? !options.type.includes(type)
          : type !== options.type)
      ) {
        throw AuthorizationError(`Invalid authentication type`);
      }

      // not awaiting the promises here so that the request is not blocked
      user.updateActiveAt(ctx).catch((err) => {
        Logger.error("Failed to update user activeAt", err);
      });
      user.team?.updateActiveAt().catch((err) => {
        Logger.error("Failed to update team activeAt", err);
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
    } catch (err) {
      if (options.optional) {
        ctx.state.auth = {};
      } else {
        throw err;
      }
    }

    Object.defineProperty(ctx, "context", {
      get() {
        return {
          auth: ctx.state.auth,
          transaction: ctx.state.transaction,
          ip: ctx.request.ip,
        };
      },
    });

    return next();
  };
}
