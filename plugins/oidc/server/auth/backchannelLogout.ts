import JWT, { type Algorithm } from "jsonwebtoken";
import { uniq } from "es-toolkit";
import { toError } from "@shared/utils/error";
import { Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import {
  AuthenticationProvider,
  User,
  UserAuthentication,
} from "@server/models";
import Redis from "@server/storage/redis";
import type { AppContext } from "@server/types";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import config from "../../plugin.json";
import type { JWKSCache } from "../JWKSCache";

export interface BackchannelLogoutOptions {
  /** The provider key set, used to verify the token signature. */
  jwks: JWKSCache;
  /** The client identifier that must appear in the token audience. */
  audience: string;
  /** The identifier the token issuer must name itself with. */
  issuer: string;
}

export interface LogoutTokenClaims {
  /** The unique identifier of the token. */
  jti: string;
  /** The subject the logout applies to, as known to the provider. */
  sub?: string;
  /** The provider session the logout applies to. */
  sid?: string;
}

/** Raised when a logout token is missing, malformed, or cannot be trusted. */
export class LogoutTokenError extends Error {}

/**
 * The event identifier that distinguishes a logout token from an ID token.
 * https://openid.net/specs/openid-connect-backchannel-1_0.html#LogoutToken
 */
const LogoutEvent = "http://schemas.openid.net/event/backchannel-logout";

/** The signature algorithms a logout token may be signed with. */
const Algorithms: Algorithm[] = [
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
];

/** How long a token remains acceptable after it was issued. */
const MaxTokenAge = "5m";

/** Permitted difference between the provider's clock and our own, in seconds. */
const ClockTolerance = Minute.seconds;

/** How long a consumed token identifier is retained to reject replays. */
const ReplayWindowSeconds = Minute.seconds * 10;

/**
 * Validates a back-channel logout token against the OpenID Connect
 * specification and records it so that it cannot be presented a second time.
 *
 * @param token The encoded logout token.
 * @param options The provider key set and expected token claims.
 * @returns the validated claims.
 * @throws {LogoutTokenError} if the token cannot be trusted.
 */
export async function validateLogoutToken(
  token: string,
  options: BackchannelLogoutOptions
): Promise<LogoutTokenClaims> {
  const decoded = JWT.decode(token, { complete: true });

  if (!decoded || typeof decoded.payload === "string") {
    throw new LogoutTokenError("Logout token is not a valid JWT");
  }

  // Pinning the algorithm before and during verification rejects both
  // unsigned tokens and tokens signed with a symmetric key of our own.
  if (!Algorithms.some((algorithm) => algorithm === decoded.header.alg)) {
    throw new LogoutTokenError(
      `Logout token signature algorithm "${decoded.header.alg}" is not supported`
    );
  }

  const key = await options.jwks.getSigningKey(decoded.header.kid);

  let payload;
  try {
    payload = JWT.verify(token, key, {
      algorithms: Algorithms,
      audience: options.audience,
      issuer: options.issuer,
      maxAge: MaxTokenAge,
      clockTolerance: ClockTolerance,
    });
  } catch (err) {
    throw new LogoutTokenError(toError(err).message);
  }

  if (typeof payload === "string") {
    throw new LogoutTokenError("Logout token has no claims");
  }

  const events = payload.events;
  if (
    !events ||
    typeof events !== "object" ||
    typeof events[LogoutEvent] !== "object"
  ) {
    throw new LogoutTokenError(
      "Logout token is missing the back-channel logout event claim"
    );
  }

  // A nonce identifies an ID token. Its presence means the provider, or an
  // attacker, supplied a token that was issued for a different purpose.
  if ("nonce" in payload) {
    throw new LogoutTokenError("Logout token must not contain a nonce claim");
  }

  const { jti, sub, sid } = payload;

  if (typeof jti !== "string") {
    throw new LogoutTokenError("Logout token is missing a jti claim");
  }
  if (typeof sub !== "string" && typeof sid !== "string") {
    throw new LogoutTokenError("Logout token is missing a sub or sid claim");
  }

  // Recorded only once the token is otherwise trusted, so that an unverified
  // request cannot fill the store.
  const stored = await Redis.defaultClient.set(
    RedisPrefixHelper.getLogoutTokenReplayKey(config.id, jti),
    "1",
    "EX",
    ReplayWindowSeconds,
    "NX"
  );

  if (stored !== "OK") {
    throw new LogoutTokenError("Logout token has already been used");
  }

  return { jti, sub, sid };
}

/**
 * Creates a route handler that accepts provider-initiated logout notifications
 * and ends the Outline sessions of the identified user.
 *
 * @param options The provider key set and expected token claims.
 * @returns the route handler.
 */
export function backchannelLogout(options: BackchannelLogoutOptions) {
  return async function backchannelLogoutHandler(ctx: AppContext) {
    // The response carries the outcome of a state change and must never be
    // stored by an intermediary.
    ctx.set("Cache-Control", "no-cache, no-store");

    const token = ctx.request.body?.logout_token;
    if (typeof token !== "string" || !token) {
      return respondWithError(ctx, "A logout_token parameter is required");
    }

    let claims;
    try {
      claims = await validateLogoutToken(token, options);
    } catch (err) {
      if (err instanceof LogoutTokenError) {
        Logger.warn("Rejected an OIDC back-channel logout token", {
          error: err.message,
        });
        return respondWithError(ctx, err.message);
      }
      throw err;
    }

    // Outline cannot revoke an individual session, so a logout scoped to a
    // provider session alone cannot be honored.
    if (!claims.sub) {
      return respondWithError(
        ctx,
        "Logout token must contain a sub claim, session-scoped logout is not supported"
      );
    }

    await revokeSessions(claims.sub);

    ctx.status = 200;
    ctx.body = "";
  };
}

/**
 * Ends every Outline session belonging to the users that authenticated with
 * the given provider subject.
 */
async function revokeSessions(profileId: string) {
  const providers = await AuthenticationProvider.findAll({
    attributes: ["id"],
    where: { name: config.id, enabled: true },
  });

  if (providers.length === 0) {
    return;
  }

  const authentications = await UserAuthentication.findAll({
    attributes: ["userId"],
    where: {
      providerId: profileId,
      authenticationProviderId: providers.map((provider) => provider.id),
    },
  });

  const userIds = uniq(
    authentications.map((authentication) => authentication.userId)
  );

  if (userIds.length === 0) {
    // Not an error – the subject may belong to another application entirely.
    Logger.info(
      "authentication",
      "No user matched an OIDC back-channel logout request"
    );
    return;
  }

  const users = await User.findAll({ where: { id: userIds } });

  // Rotating the secret invalidates every token issued to the user, signing
  // them out of all of their devices.
  await Promise.all(users.map((user) => user.rotateJwtSecret({})));

  Logger.info(
    "authentication",
    `Revoked sessions for ${users.length} user(s) after OIDC back-channel logout`
  );
}

/**
 * Responds with the error shape the specification defines for a logout request
 * that could not be handled.
 */
function respondWithError(ctx: AppContext, description: string) {
  ctx.status = 400;
  ctx.body = {
    error: "invalid_request",
    error_description: description,
  };
}
