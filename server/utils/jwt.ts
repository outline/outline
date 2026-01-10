import { subMinutes } from "date-fns";
import JWT from "jsonwebtoken";
import type { FindOptions } from "sequelize";
import { Team, User } from "@server/models";
import { AuthenticationError, UserSuspendedError } from "../errors";
import type { Context } from "koa";

export function getJWTPayload(token: string) {
  let payload;
  if (!token) {
    throw AuthenticationError("Missing token");
  }

  try {
    payload = JWT.decode(token);

    if (!payload) {
      throw AuthenticationError("Invalid token");
    }

    return payload as JWT.JwtPayload;
  } catch (_err) {
    throw AuthenticationError("Unable to decode token");
  }
}

/**
 * Retrieves the user associated with a JWT token, validating the token's type and expiration.
 *
 * @param token The JWT token to validate and extract the user from.
 * @param allowedTypes An array of allowed token types (default: ["session", "transfer"]). The token's type must be included in this array to be considered valid.
 * @returns An object containing the user associated with the token and an optional service string if included in the token's payload.
 * @throws AuthenticationError if the token is missing, invalid, expired, or if the token's type is not allowed.
 * @throws UserSuspendedError if the user associated with the token is suspended.
 */
export async function getUserForJWT(
  token: string,
  allowedTypes = ["session", "transfer"]
): Promise<{ user: User; service?: string }> {
  const payload = getJWTPayload(token);

  if (!allowedTypes.includes(payload.type)) {
    throw AuthenticationError("Invalid token");
  }

  // check the token is within it's expiration time
  if (payload.expiresAt) {
    if (new Date(payload.expiresAt) < new Date()) {
      throw AuthenticationError("Expired token");
    }
  }

  const user = await User.findByPk(payload.id, {
    include: [
      {
        model: Team,
        as: "team",
        required: true,
      },
    ],
  });
  if (!user) {
    throw AuthenticationError("Invalid token");
  }

  if (user.isSuspended) {
    const suspendingAdmin = user.suspendedById
      ? await User.findByPk(user.suspendedById)
      : undefined;
    throw UserSuspendedError({
      adminEmail: suspendingAdmin?.email || undefined,
    });
  }

  if (payload.type === "transfer") {
    // If the user has made a single API request since the transfer token was
    // created then it's no longer valid, they'll need to sign in again.
    if (
      user.lastActiveAt &&
      payload.createdAt &&
      user.lastActiveAt > new Date(payload.createdAt)
    ) {
      throw AuthenticationError("Token has already been used");
    }
  }

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (_err) {
    throw AuthenticationError("Invalid token");
  }

  return {
    user,
    service: payload.service as string | undefined,
  };
}

export async function getUserForEmailSigninToken(
  ctx: Context,
  token: string
): Promise<User> {
  const payload = getJWTPayload(token);

  if (payload.type !== "email-signin") {
    throw AuthenticationError("Invalid token");
  }

  // check the token is within it's expiration time
  if (payload.createdAt) {
    if (new Date(payload.createdAt) < subMinutes(new Date(), 10)) {
      throw AuthenticationError("Expired token");
    }
  }

  if (payload.ip !== ctx.request.ip) {
    throw AuthenticationError("Token mismatch");
  }

  const user = await User.scope("withTeam").findByPk(payload.id, {
    rejectOnEmpty: true,
  });

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (_err) {
    throw AuthenticationError("Invalid token");
  }

  return user;
}

export async function getDetailsForEmailUpdateToken(
  token: string,
  options: FindOptions<User> = {}
): Promise<{ user: User; email: string }> {
  const payload = getJWTPayload(token);

  if (payload.type !== "email-update") {
    throw AuthenticationError("Invalid token");
  }

  // check the token is within it's expiration time
  if (payload.createdAt) {
    if (new Date(payload.createdAt) < subMinutes(new Date(), 10)) {
      throw AuthenticationError("Expired token");
    }
  }

  const email = payload.email;
  const user = await User.findByPk(payload.id, {
    rejectOnEmpty: true,
    ...options,
  });

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (_err) {
    throw AuthenticationError("Invalid token");
  }

  return { user, email };
}
