import JWT, { type Algorithm } from "jsonwebtoken";
import { z } from "zod";
import { uniq } from "es-toolkit";
import { errToId, toError } from "@shared/utils/error";
import { Minute } from "@shared/utils/time";
import { OIDCLogoutTokenError } from "@server/errors";
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
 * The claims a logout token must carry. The logout event must hold a JSON
 * object rather than any other JSON type, and a nonce is refused because it
 * identifies an ID token, which must not be accepted in place of a logout
 * token.
 */
const LogoutTokenSchema = z
  .object({
    jti: z.string(),
    iat: z.number(),
    exp: z.number(),
    aud: z.union([z.string(), z.array(z.string())]),
    azp: z.string().optional(),
    sub: z.string().optional(),
    sid: z.string().optional(),
    nonce: z.undefined().optional(),
    events: z.object({
      [LogoutEvent]: z.looseObject({}),
    }),
  })
  .refine((claims) => !!claims.sub || !!claims.sid, {
    error: "a sub or sid claim is required",
  });

/**
 * Validates a back-channel logout token against the OpenID Connect
 * specification and records it so that it cannot be presented a second time.
 *
 * @param token The encoded logout token.
 * @param options The provider key set and expected token claims.
 * @returns the validated claims.
 * @throws {OIDCLogoutTokenError} if the token cannot be trusted.
 */
export async function validateLogoutToken(
  token: string,
  options: BackchannelLogoutOptions
): Promise<LogoutTokenClaims> {
  const decoded = JWT.decode(token, { complete: true });

  if (!decoded || typeof decoded.payload === "string") {
    throw OIDCLogoutTokenError("Logout token is not a valid JWT");
  }

  // Pinning the algorithm before and during verification rejects both
  // unsigned tokens and tokens signed with a symmetric key of our own.
  if (!Algorithms.some((algorithm) => algorithm === decoded.header.alg)) {
    throw OIDCLogoutTokenError(
      `Logout token signature algorithm "${decoded.header.alg}" is not supported`
    );
  }

  let payload;
  try {
    // Resolving the key is part of validation – an unknown key identifier, or
    // a key set that cannot be reached, must be reported as a rejected token
    // rather than as a fault of our own.
    const key = await options.jwks.getSigningKey(decoded.header.kid);

    payload = JWT.verify(token, key, {
      algorithms: Algorithms,
      audience: options.audience,
      issuer: options.issuer,
      maxAge: MaxTokenAge,
      clockTolerance: ClockTolerance,
    });
  } catch (err) {
    throw OIDCLogoutTokenError(toError(err).message);
  }

  if (typeof payload === "string") {
    throw OIDCLogoutTokenError("Logout token has no claims");
  }

  const result = LogoutTokenSchema.safeParse(payload);

  if (!result.success) {
    throw OIDCLogoutTokenError(
      `Logout token claims are invalid – ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "claims"}: ${issue.message}`)
        .join(", ")}`
    );
  }

  const { jti, sub, sid, aud, azp } = result.data;

  // Verification proved this client is one of the audiences. Any further
  // audience belongs to a party we do not trust, so the token is only accepted
  // when it names this client as the authorized party.
  // https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation
  if (Array.isArray(aud) && aud.length > 1 && azp !== options.audience) {
    throw OIDCLogoutTokenError(
      "Logout token has more than one audience and does not name this client in the azp claim"
    );
  }
  if (azp !== undefined && azp !== options.audience) {
    throw OIDCLogoutTokenError(
      "Logout token names another authorized party in the azp claim"
    );
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
    throw OIDCLogoutTokenError("Logout token has already been used");
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
      if (errToId(err) !== "invalid_logout_token") {
        throw err;
      }

      const { message } = toError(err);
      Logger.warn("Rejected an OIDC back-channel logout token", {
        error: message,
        expectedIssuer: options.issuer,
        expectedAudience: options.audience,
        ip: ctx.ip,
        ...describeToken(token),
      });
      return respondWithError(ctx, message);
    }

    // Outline cannot revoke an individual session, so a logout scoped to a
    // provider session alone cannot be honored.
    if (!claims.sub) {
      return respondWithError(
        ctx,
        "Logout token must contain a sub claim, session-scoped logout is not supported"
      );
    }

    try {
      await revokeSessions(claims.sub);
    } catch (err) {
      // The logout did not complete, so give up the replay record. Holding it
      // would refuse the provider's retry of the very same token.
      await releaseLogoutToken(claims.jti);
      throw err;
    }

    // The specification requires 200 on success, providers may treat any other
    // status as a failed logout.
    ctx.status = 200;
    ctx.body = "";
  };
}

/**
 * Discards the replay record of a token, so that a provider can present it
 * again after a logout that could not be completed. Best-effort – never throws.
 */
async function releaseLogoutToken(tokenId: string) {
  try {
    await Redis.defaultClient.del(
      RedisPrefixHelper.getLogoutTokenReplayKey(config.id, tokenId)
    );
  } catch (err) {
    Logger.warn("Failed to release an OIDC logout token record", {
      tokenId,
      error: toError(err).message,
    });
  }
}

/**
 * Describes a rejected token for the log. The token did not pass validation,
 * so every value here is unverified and is only a record of what was received.
 */
function describeToken(token: string) {
  const decoded = JWT.decode(token, { complete: true });

  if (!decoded || typeof decoded.payload === "string") {
    return { tokenLength: token.length };
  }

  const { iss, aud, sub, sid, jti, iat, exp } = decoded.payload;

  return {
    algorithm: decoded.header.alg,
    keyId: decoded.header.kid,
    issuer: iss,
    audience: aud,
    subject: sub,
    sessionId: sid,
    tokenId: jti,
    issuedAt: iat ? new Date(iat * 1000).toISOString() : undefined,
    expiresAt: exp ? new Date(exp * 1000).toISOString() : undefined,
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
