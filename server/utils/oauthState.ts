import JWT from "jsonwebtoken";
import { Client } from "@shared/types";
import env from "@server/env";
import { OAuthStateMismatchError } from "@server/errors";
import { hash } from "./crypto";

const Algorithm = "HS256";
const ExpiresInSeconds = 10 * 60;
const IntentType = "oauth_intent";
const StateType = "oauth_state";

interface OAuthIntentInput {
  host: string;
  actorId?: string;
  actorSessionHash?: string;
  client: Client;
}

interface OAuthStateInput extends OAuthIntentInput {
  codeVerifier?: string;
  nonceHash: string;
}

interface OAuthIntentClaims extends OAuthIntentInput {
  type: typeof IntentType;
}

interface OAuthStateClaims extends OAuthStateInput {
  type: typeof StateType;
}

export interface OAuthIntent extends OAuthIntentClaims {
  iat: number;
  exp: number;
}

export interface OAuthState extends OAuthStateClaims {
  iat: number;
  exp: number;
}

/**
 * Hashes an OAuth CSRF nonce for storage in signed OAuth state.
 *
 * @param nonce the nonce stored in the browser cookie.
 * @returns the sha256 hash of the nonce.
 */
export function hashOAuthStateNonce(nonce: string): string {
  return hash(nonce);
}

/**
 * Creates a short-lived signed OAuth intent token.
 *
 * @param payload the intent values to sign.
 * @returns the signed intent token.
 */
export function signOAuthIntent(payload: OAuthIntentInput): string {
  return sign({
    ...payload,
    type: IntentType,
  });
}

/**
 * Verifies a signed OAuth intent token.
 *
 * @param token the token to verify.
 * @returns the verified intent payload.
 * @throws {OAuthStateMismatchError} if the token is missing, expired, invalid,
 * or has an unexpected payload shape.
 */
export function verifyOAuthIntent(token: string): OAuthIntent {
  const payload = verify(token);

  if (!isOAuthIntent(payload)) {
    throw OAuthStateMismatchError("Invalid OAuth intent");
  }

  return payload;
}

/**
 * Creates a short-lived signed OAuth state token.
 *
 * @param payload the OAuth state values to sign.
 * @returns the signed OAuth state token.
 */
export function signOAuthState(payload: OAuthStateInput): string {
  return sign({
    ...payload,
    type: StateType,
  });
}

/**
 * Verifies a signed OAuth state token.
 *
 * @param token the token to verify.
 * @returns the verified OAuth state payload.
 * @throws {OAuthStateMismatchError} if the token is missing, expired, invalid,
 * or has an unexpected payload shape.
 */
export function verifyOAuthState(token: string): OAuthState {
  const payload = verify(token);

  if (!isOAuthState(payload)) {
    throw OAuthStateMismatchError("Invalid OAuth state");
  }

  return payload;
}

function sign(payload: OAuthIntentClaims | OAuthStateClaims): string {
  return JWT.sign(payload, env.SECRET_KEY, {
    algorithm: Algorithm,
    expiresIn: ExpiresInSeconds,
  });
}

function verify(token: string): JWT.JwtPayload {
  try {
    const payload = JWT.verify(token, env.SECRET_KEY, {
      algorithms: [Algorithm],
    });

    if (typeof payload === "string") {
      throw OAuthStateMismatchError("Invalid OAuth state");
    }

    return payload;
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw OAuthStateMismatchError("Expired OAuth state");
    }

    throw OAuthStateMismatchError("Invalid OAuth state");
  }
}

function isOAuthIntent(payload: JWT.JwtPayload): payload is OAuthIntent {
  return (
    payload.type === IntentType &&
    typeof payload.host === "string" &&
    isClient(payload.client) &&
    isOptionalString(payload.actorId) &&
    isOptionalString(payload.actorSessionHash) &&
    payload.nonceHash === undefined &&
    payload.codeVerifier === undefined &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number"
  );
}

function isOAuthState(payload: JWT.JwtPayload): payload is OAuthState {
  return (
    payload.type === StateType &&
    typeof payload.host === "string" &&
    isClient(payload.client) &&
    isOptionalString(payload.actorId) &&
    isOptionalString(payload.actorSessionHash) &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number" &&
    typeof payload.nonceHash === "string" &&
    isOptionalString(payload.codeVerifier)
  );
}

function isClient(value: string | undefined): value is Client {
  return value === Client.Desktop || value === Client.Web;
}

function isOptionalString(
  value: string | undefined
): value is string | undefined {
  return value === undefined || typeof value === "string";
}
