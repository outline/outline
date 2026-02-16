import type { Next } from "koa";
import capitalize from "lodash/capitalize";
import type { UserRole } from "@shared/types";
import { UserRoleHelper } from "@shared/utils/UserRoleHelper";
import tracer, {
  addTags,
  getRootSpanFromRequestContext,
} from "@server/logging/tracer";
import { User, Team, ApiKey, OAuthAuthentication } from "@server/models";
import type { AppContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { getUserForJWT } from "@server/utils/jwt";
import {
  AuthenticationError,
  AuthorizationError,
  UserSuspendedError,
} from "../errors";

type AuthenticationOptions = {
  /** Role required to access the route. */
  role?: UserRole;
  /** Type of authentication required to access the route. */
  type?: AuthenticationType | AuthenticationType[];
  /** Authentication is parsed, but optional. */
  optional?: boolean;
};

type AuthTransport = "cookie" | "header" | "body" | "query";

type AuthInput = {
  /** The authentication token extracted from the request, if any. */
  token?: string;
  /** The method used to receive the authentication token. */
  transport?: AuthTransport;
};

export default function auth(options: AuthenticationOptions = {}) {
  return async function authMiddleware(ctx: AppContext, next: Next) {
    try {
      const { type, token, user, service, scope } =
        await validateAuthentication(ctx, options);

      await Promise.all([
        user.updateActiveAt(ctx),
        user.team?.updateActiveAt(),
      ]);

      ctx.state.auth = {
        user,
        token,
        type,
        service,
        scope,
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

    return next();
  };
}

/**
 * Parses the authentication token from the request context.
 *
 * @param ctx The application context containing the request information.
 * @returns An object containing the token and its transport method.
 */
export function parseAuthentication(ctx: AppContext): AuthInput {
  const authorizationHeader = ctx.request.get("authorization");

  if (authorizationHeader) {
    const parts = authorizationHeader.split(" ");

    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];

      if (/^Bearer$/i.test(scheme)) {
        return {
          token: credentials,
          transport: "header",
        };
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
    return {
      token: String(ctx.request.body.token),
      transport: "body",
    };
  } else if (ctx.request.query?.token) {
    return {
      token: String(ctx.request.query.token),
      transport: "query",
    };
  } else {
    const accessToken = ctx.cookies.get("accessToken");
    if (accessToken) {
      return {
        token: accessToken,
        transport: "cookie",
      };
    }
  }

  return {
    token: undefined,
    transport: undefined,
  };
}

async function validateAuthentication(
  ctx: AppContext,
  options: AuthenticationOptions
): Promise<{
  user: User;
  token: string;
  type: AuthenticationType;
  service?: string;
  scope?: string[];
}> {
  const { token, transport } = parseAuthentication(ctx);

  if (!token) {
    throw AuthenticationError("Authentication required");
  }

  let user: User | null;
  let type: AuthenticationType;
  let service: string | undefined;
  let scope: string[] | undefined;

  if (OAuthAuthentication.match(token)) {
    if (transport !== "header") {
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
    } catch (_err) {
      throw AuthenticationError("Invalid access token");
    }
    if (!authentication) {
      throw AuthenticationError("Invalid access token");
    }
    if (authentication.accessTokenExpiresAt < new Date()) {
      throw AuthenticationError("Access token is expired");
    }
    if (!authentication.canAccess(ctx.originalUrl)) {
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

    scope = authentication.scope;
    await authentication.updateActiveAt();
  } else if (ApiKey.match(token)) {
    if (transport === "cookie") {
      throw AuthenticationError("API key must not be passed in the cookie");
    }

    type = AuthenticationType.API;
    let apiKey;

    try {
      apiKey = await ApiKey.findByToken(token);
    } catch (_err) {
      throw AuthenticationError("Invalid API key");
    }

    if (!apiKey) {
      throw AuthenticationError("Invalid API key");
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw AuthenticationError("API key is expired");
    }

    if (!apiKey.canAccess(ctx.originalUrl)) {
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
    const result = await getUserForJWT(token);
    user = result.user;
    service = result.service;
  }

  if (user.isSuspended) {
    const suspendingAdmin = user.suspendedById
      ? await User.findByPk(user.suspendedById)
      : undefined;
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

  return {
    user,
    type,
    token,
    service,
    scope,
  };
}
