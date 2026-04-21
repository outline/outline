import { addMonths } from "date-fns";
import type { Next } from "koa";
import capitalize from "lodash/capitalize";
import { Op } from "sequelize";
import { UserRole } from "@shared/types";
import { slugifyDomain } from "@shared/utils/domains";
import { parseEmail } from "@shared/utils/email";
import { UserRoleHelper } from "@shared/utils/UserRoleHelper";
import tracer, {
  addTags,
  getRootSpanFromRequestContext,
} from "@server/logging/tracer";
import teamCreator from "@server/commands/teamCreator";
import { createContext } from "@server/context";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { User, Team, ApiKey, OAuthAuthentication } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { AppContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { getUserForJWT } from "@server/utils/jwt";
import {
  AuthenticationError,
  AuthorizationError,
  UserSuspendedError,
} from "../errors";

/** Service identifier used by the ForwardAuth authentication flow. */
export const FORWARDAUTH_SERVICE = "forwardauth";

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

      // On the first ForwardAuth-authenticated request, issue a JWT cookie so
      // that subsequent requests and cookie-dependent services (WebSocket,
      // collaboration) use the fast JWT path instead of the header DB path.
      if (service === FORWARDAUTH_SERVICE && !ctx.cookies.get("accessToken")) {
        const expires = addMonths(new Date(), 3);
        ctx.cookies.set("accessToken", user.getJwtToken(expires, service), {
          sameSite: "lax",
          expires,
        });
        ctx.cookies.set("lastSignedIn", FORWARDAUTH_SERVICE, {
          httpOnly: false,
          sameSite: "lax",
          expires: new Date("2100"),
        });
      }

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
      // If a cookie-transported JWT caused the 401, clear it so the browser
      // stops sending it. On the next request ForwardAuth headers take over
      // and a fresh session is issued. Only clear when the cookie was the
      // active transport (no Authorization: Bearer header present).
      //
      // IMPORTANT: ctx.cookies.set() cannot be used here — Koa's onerror
      // handler strips all response headers before sending the error response,
      // then re-applies only err.headers (context.js:139-146). Attaching the
      // Set-Cookie directives to the error object is the only way they survive.
      const authInput = parseAuthentication(ctx);
      if (
        err.status === 401 &&
        authInput.transport === "cookie" &&
        !ctx.request.get("authorization") &&
        ctx.cookies.get("accessToken")
      ) {
        const epoch = "Thu, 01 Jan 1970 00:00:00 GMT";
        err.headers = {
          ...err.headers,
          "set-cookie": [
            `accessToken=; expires=${epoch}; path=/`,
            `lastSignedIn=; expires=${epoch}; path=/`,
          ],
        };
      }
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

  // Check proxy-injected identity headers last — after all conventional
  // credentials — so an existing session cookie (or Bearer token) is always
  // preferred. This means once the JWT cookie has been issued the header path
  // is bypassed entirely, avoiding a DB round-trip on every request.
  if (env.AUTH_TYPE === "SSO") {
    const authRequestEmail = ctx.request.get("x-auth-request-email");
    if (authRequestEmail) {
      return {
        token: `fwd:${authRequestEmail}`,
        transport: "header",
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

    scope = apiKey.scope ?? ["*"];
    await apiKey.updateActiveAt();
  } else if (token.startsWith("fwd:") && env.AUTH_TYPE === "SSO") {
    type = AuthenticationType.APP;
    service = FORWARDAUTH_SERVICE;

    const emailClaim = token.slice(4).toLowerCase().trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClaim);
    const email = isValidEmail
      ? emailClaim
      : `${emailClaim.split("@")[0]}@${env.DEFAULT_EMAIL_DOMAIN}`;
    const localPart = emailClaim.split("@")[0];
    const displayName = ctx.request.get("x-auth-request-user") || localPart;
    const { domain } = parseEmail(email);

    // Find an existing user by email across all teams (self-hosted deployments
    // have a single team, but we don't restrict by team here so that the lookup
    // is reliable even in test environments with multiple teams).
    user = await User.scope("withTeam").findOne({
      where: {
        email: { [Op.iLike]: email },
      },
    });

    if (!user) {
      // Self-hosted deployments have a single team. When none exists yet the
      // first arriving user bootstraps the installation.
      let team = await Team.findOne();
      let isNewTeam = false;

      if (!team) {
        Logger.info("authentication", "Provisioning new team via ForwardAuth", {
          domain,
        });
        const subdomain = slugifyDomain(domain ?? "team");
        team = await sequelize.transaction((transaction) =>
          teamCreator(createContext({ ip: ctx.ip, transaction }), {
            name: env.APP_NAME,
            subdomain,
            authenticationProviders: [
              {
                name: FORWARDAUTH_SERVICE,
                providerId: domain ?? FORWARDAUTH_SERVICE,
              },
            ],
          })
        );
        isNewTeam = true;
      }

      Logger.info("authentication", "Provisioning new user via ForwardAuth", {
        email,
      });
      const created = await User.create({
        name: displayName,
        email,
        teamId: team.id,
        // First user into a brand-new team becomes admin.
        role: isNewTeam ? UserRole.Admin : team.defaultUserRole,
        lastActiveAt: new Date(),
        lastActiveIp: ctx.ip,
      });
      // Reload with associations so downstream middleware sees a full User.
      user = await User.scope("withTeam").findByPk(created.id);
      if (!user) {
        throw AuthenticationError("Failed to provision ForwardAuth user");
      }
    }
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
