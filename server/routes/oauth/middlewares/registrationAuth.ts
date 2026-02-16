import type { Context, Next } from "koa";
import { AuthenticationError } from "@server/errors";
import { OAuthClient } from "@server/models";

/**
 * Middleware that authenticates requests to the RFC 7592 client registration
 * management endpoint using a Bearer token (registration_access_token).
 *
 * Verifies the token matches the client identified by the `:clientId` route
 * parameter and attaches the client to `ctx.state.oauthClient`.
 */
export default function registrationAuth() {
  return async function registrationAuthMiddleware(ctx: Context, next: Next) {
    const authorization = ctx.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw AuthenticationError("Missing or invalid Authorization header");
    }

    const token = authorization.slice(7);
    if (!token) {
      throw AuthenticationError("Missing registration access token");
    }

    const client = await OAuthClient.findByRegistrationAccessToken(token, {
      transaction: ctx.state.transaction,
      lock: ctx.state.transaction?.LOCK.UPDATE,
    });
    if (!client) {
      throw AuthenticationError("Invalid registration access token");
    }

    const { clientId } = ctx.params;
    if (client.clientId !== clientId) {
      throw AuthenticationError("Token does not match the specified client");
    }

    ctx.state.oauthClient = client;
    return next();
  };
}
