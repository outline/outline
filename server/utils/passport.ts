import crypto from "node:crypto";
import { addMinutes, subMinutes } from "date-fns";
import type { Context } from "koa";
import type {
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from "passport-oauth2";
import type { Primitive } from "utility-types";
import { Client } from "@shared/types";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import { Team } from "@server/models";
import { InternalError, OAuthStateMismatchError } from "../errors";
import fetch from "./fetch";
import { getUserForJWT } from "./jwt";

export class StateStore {
  constructor(private pkce = false) {}

  key = "state";

  store = (
    ctx: Context,
    verifierOrCallback: StateStoreStoreCallback | string,
    _state?: Record<string, Primitive>,
    _meta?: unknown,
    cb?: StateStoreStoreCallback
  ) => {
    // token is a short lived one-time pad to prevent replay attacks
    const token = crypto.randomBytes(8).toString("hex");

    // Note parameters are based on whether PKCE is in use or not, this is parameters
    // of how the underlying library is architected, see:
    // https://github.com/jaredhanson/passport-oauth2/blob/be9bf58cee75938c645a9609f0cc87c4c724e7c8/lib/strategy.js#L289-L298
    const callback =
      typeof verifierOrCallback === "function" ? verifierOrCallback : cb;
    if (!callback) {
      throw InternalError("Callback is required");
    }

    const codeVerifier =
      typeof verifierOrCallback === "function" ? undefined : verifierOrCallback;

    // We expect host to be a team subdomain, custom domain, or apex domain
    // that is passed via query param from the auth provider component.
    const clientInput = ctx.query.client?.toString();
    const client = clientInput === Client.Desktop ? Client.Desktop : Client.Web;
    const host = ctx.query.host?.toString() || parseDomain(ctx.hostname).host;
    const accessToken = ctx.cookies.get("accessToken");
    const state = buildState({
      host,
      token,
      client,
      codeVerifier,
      accessToken,
    });

    ctx.cookies.set(this.key, state, {
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(ctx.hostname, env.isCloudHosted),
    });

    callback(null, token);
  };

  verify = (
    ctx: Context,
    providedToken: string,
    callback: StateStoreVerifyCallback
  ) => {
    const state = ctx.cookies.get(this.key);

    if (!state) {
      return callback(
        OAuthStateMismatchError("No state was available after OAuth flow"),
        false,
        state
      );
    }

    const { token, codeVerifier } = parseState(state);

    // Destroy the one-time pad token and ensure it matches
    ctx.cookies.set(this.key, "", {
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(ctx.hostname, env.isCloudHosted),
    });

    if (!token || token !== providedToken) {
      return callback(
        OAuthStateMismatchError("Token in state mismatched"),
        false,
        token
      );
    }

    // @ts-expect-error Type in library is wrong
    callback(null, codeVerifier ?? true, state);
  };
}

export async function request(
  method: "GET" | "POST",
  endpoint: string,
  accessToken: string
) {
  const response = await fetch(endpoint, {
    method,
    allowPrivateIPAddress: true,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (_err) {
    throw InternalError(
      `Failed to parse response from ${endpoint}. Expected JSON, got: ${text}`
    );
  }
}

function buildState({
  host,
  token,
  client,
  codeVerifier,
  accessToken,
}: {
  host: string;
  token: string;
  client?: Client;
  codeVerifier?: string;
  accessToken?: string;
}) {
  return [host, token, client, codeVerifier, accessToken].join("|");
}

/**
 * Parses the state string into its components.
 *
 * @param state The state string
 * @returns An object containing the parsed components
 */
export function parseState(state: string) {
  const [host, token, client, rawCodeVerifier, rawAccessToken] =
    state.split("|");
  const codeVerifier = rawCodeVerifier ? rawCodeVerifier : undefined;
  const accessToken = rawAccessToken ? rawAccessToken : undefined;
  return { host, token, client, codeVerifier, accessToken };
}

/**
 * Returns the client type from the context if available. Used to redirect
 * the user back to the correct client after the OAuth flow.
 *
 * @param ctx The Koa context
 * @returns The client type, defaults to Client.Web
 */
export function getClientFromOAuthState(ctx: Context): Client {
  const state = ctx.cookies.get("state");
  const client = state ? parseState(state).client : undefined;
  return client === Client.Desktop ? Client.Desktop : Client.Web;
}

/**
 * Returns the access token from the context if available. This is used
 * to restore the session during the OAuth flow when connecting additional
 * providers to an existing team.
 *
 * @param ctx The Koa context
 * @returns The access token if available, otherwise undefined
 */
export function getAccessTokenFromOAuthState(ctx: Context): string | undefined {
  const state = ctx.cookies.get("state");
  return state ? parseState(state).accessToken : undefined;
}

/**
 * Returns the user from the context if they are authenticated. This is used
 * to restore the session during the OAuth flow.
 *
 * @param ctx The Koa context
 * @returns The user if authenticated, otherwise undefined
 */
export async function getUserFromOAuthState(ctx: Context) {
  const token = getAccessTokenFromOAuthState(ctx);
  if (!token) {
    return undefined;
  }

  try {
    const { user } = await getUserForJWT(token);
    return user;
  } catch (_err) {
    return undefined;
  }
}

type TeamFromContextOptions = {
  /**
   * Whether to consider the state cookie in the context when determining the team.
   * If true, the state cookie will be parsed to determine the host and infer the team
   * this should only be used in the authentication process.
   */
  includeStateCookie?: boolean;
};

/**
 * Infers the team from the context based on the hostname or state cookie.
 *
 * @param ctx The Koa context
 * @param options Options for determining the team
 * @returns The inferred team or undefined if not found
 */
export async function getTeamFromContext(
  ctx: Context,
  options: TeamFromContextOptions = { includeStateCookie: true }
) {
  // "domain" is the domain the user came from when attempting auth
  // we use it to infer the team they intend on signing into
  const state = options.includeStateCookie
    ? ctx.cookies.get("state")
    : undefined;
  const host = state ? parseState(state).host : ctx.hostname;
  const domain = parseDomain(host);

  let team;
  if (!env.isCloudHosted) {
    if (env.ENVIRONMENT === "test") {
      team = await Team.findOne({ where: { domain: env.URL } });
    } else {
      team = await Team.findOne({
        order: [["createdAt", "DESC"]],
      });
    }
  } else if (ctx.state?.rootShare) {
    team = await Team.findByPk(ctx.state.rootShare.teamId);
  } else if (domain.custom) {
    team = await Team.findOne({ where: { domain: domain.host } });
  } else if (domain.teamSubdomain) {
    team = await Team.findBySubdomain(domain.teamSubdomain);
  }

  return team;
}
