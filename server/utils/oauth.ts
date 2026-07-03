import { addMinutes, subMinutes } from "date-fns";
import JWT from "jsonwebtoken";
import type { Context } from "koa";
import { errToString } from "@shared/utils/error";
import { randomString } from "@shared/random";
import { getCookieDomain } from "@shared/utils/domains";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  AuthenticationError,
  InvalidRequestError,
  OAuthStateMismatchError,
} from "../errors";
import { safeEqual } from "./crypto";
import fetch, { type Response } from "./fetch";

/**
 * Generate a random nonce, persist it in a same-origin cookie, and return it
 * for embedding in the `state` parameter of an outbound OAuth flow that is
 * initiated server-side. The matching callback handler must read the same
 * cookie via {@link verifyOAuthStateNonce}.
 *
 * @param ctx The Koa context for the request initiating the OAuth flow.
 * @param cookieName The cookie used to persist the nonce, unique per provider.
 * @returns The generated nonce.
 */
export function generateOAuthStateNonce(
  ctx: Context,
  cookieName: string
): string {
  const nonce = randomString(32);
  ctx.cookies.set(cookieName, nonce, {
    httpOnly: true,
    sameSite: "lax",
    expires: addMinutes(new Date(), 10),
    domain: getCookieDomain(ctx.hostname, env.isCloudHosted),
  });
  return nonce;
}

/**
 * Read a one-time OAuth nonce cookie, clear it, and timing-safe-compare it
 * against the nonce carried in the OAuth `state`. Throws when missing or
 * mismatched, providing CSRF protection for OAuth callbacks that perform
 * account-linking actions.
 *
 * @param ctx The Koa context for the callback request.
 * @param cookieName The cookie used to persist the nonce, unique per provider.
 * @param stateNonce The nonce extracted from the parsed OAuth state.
 * @throws {OAuthStateMismatchError} When the cookie is missing or does not
 *   match the supplied nonce.
 */
export function verifyOAuthStateNonce(
  ctx: Context,
  cookieName: string,
  stateNonce: string | undefined
): void {
  const cookieNonce = ctx.cookies.get(cookieName);
  ctx.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    expires: subMinutes(new Date(), 1),
    domain: getCookieDomain(ctx.hostname, env.isCloudHosted),
  });

  if (!safeEqual(cookieNonce, stateNonce)) {
    throw OAuthStateMismatchError();
  }
}

/**
 * Parse a UserInfo endpoint response according to OIDC Core 1.0. Claims are
 * normally returned as a JSON object with `Content-Type: application/json`,
 * but when a signed and/or encrypted response was requested during client
 * registration the provider returns a JWT with `Content-Type: application/jwt`
 * instead.
 *
 * @param response The response received from the userinfo endpoint.
 * @returns The claims contained in the response body.
 * @throws {Error} When the body cannot be parsed as JSON or a decodable JWT.
 */
export async function parseUserInfoResponse<T = JWT.JwtPayload>(
  response: Response
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const mediaType = contentType.split(";")[0].trim().toLowerCase();
  const text = await response.text();

  if (mediaType === "application/jwt") {
    // The JWT arrives directly from the provider over TLS so, as with the
    // id_token, claims are read without local signature verification.
    const claims = JWT.decode(text.trim());
    if (!claims || typeof claims !== "object") {
      throw new Error(
        "Failed to decode application/jwt response, note that encrypted responses are not supported"
      );
    }
    return claims as T;
  }

  try {
    return JSON.parse(text);
  } catch (_err) {
    throw new Error(`Expected JSON response from OIDC provider, got: ${text}`);
  }
}

export default abstract class OAuthClient {
  private clientId: string;
  private clientSecret: string;

  protected endpoints = {
    authorize: "",
    token: "",
    userinfo: "",
  };

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  userInfo = async (accessToken: string) => {
    let data;
    let response;

    try {
      response = await fetch(this.endpoints.userinfo, {
        method: "GET",
        allowPrivateIPAddress: true,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      throw InvalidRequestError(errToString(err));
    }

    const success = response.status >= 200 && response.status < 300;
    if (!success) {
      throw AuthenticationError();
    }

    try {
      data = await parseUserInfoResponse(response);
    } catch (err) {
      throw InvalidRequestError(errToString(err));
    }

    return data;
  };

  async rotateToken(
    _accessToken: string,
    refreshToken: string,
    endpoint = this.endpoints.token
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    let data;
    let response;

    try {
      Logger.debug("utils", "Rotating token", { endpoint });

      response = await fetch(endpoint, {
        method: "POST",
        allowPrivateIPAddress: true,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      data = await response.json();
    } catch (err) {
      throw InvalidRequestError(errToString(err));
    }

    const success = response.status >= 200 && response.status < 300;
    if (!success) {
      throw AuthenticationError();
    }

    return {
      refreshToken: data.refresh_token,
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }
}
