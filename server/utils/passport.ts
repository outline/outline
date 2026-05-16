import crypto from "node:crypto";
import { addMinutes, subMinutes } from "date-fns";
import type { Context, Next } from "koa";
import type {
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from "passport-oauth2";
import type { Primitive } from "utility-types";
import { Client } from "@shared/types";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import { Team, User } from "@server/models";
import Redis from "@server/storage/redis";
import { InternalError, OAuthStateMismatchError } from "../errors";
import { hash, safeEqual } from "./crypto";
import fetch from "./fetch";
import { getUserForJWT } from "./jwt";
import {
  hashOAuthStateNonce,
  signOAuthIntent,
  signOAuthState,
  verifyOAuthIntent,
  verifyOAuthState,
} from "./oauthState";

const FLOW_QUERY_PARAM = "flow";
const OAUTH_CSRF_COOKIE = "oauth_csrf";
const OAUTH_INTENT_PREFIX = "oauth:intent:";
const OAUTH_INTENT_TTL_SECONDS = 10 * 60;
const ACTOR_SESSION_HASH_KEYLEN = 64;

/**
 * Middleware for OAuth start routes that bridges cookie scopes between custom
 * team domains and the apex (env.URL) where the OAuth callback always lands.
 *
 * The OAuth callback always lands on the apex domain, while a user's
 * `accessToken` session cookie may be host-scoped to a custom team domain. To
 * make the "connect a new auth provider while signed in" flow work from a
 * custom domain:
 *
 *   1. On a custom team domain — create a short-lived signed intent containing
 *      the original host and actor id, then bounce to the apex with it.
 *   2. On the apex — verify the signed intent and stash it on `ctx.state` so
 *      `StateStore.store` can fold it into the signed OAuth `state` parameter.
 *
 * Non-custom team subdomains skip the bounce because the start route can read
 * the host-scoped session and set the OAuth CSRF cookie on the base domain for
 * the apex callback. Self-hosted deployments have a single domain and pass
 * through.
 */
export async function startOAuthFlow(ctx: Context, next: Next) {
  if (!env.isCloudHosted) {
    return next();
  }

  const apex = new URL(env.URL);
  const onApex = ctx.hostname === apex.hostname;
  const isCustom = parseDomain(ctx.hostname).custom;

  if (isCustom && !onApex) {
    const url = new URL(ctx.originalUrl, apex);
    const client = getClientFromInput(ctx);
    const actor = await getOAuthActor(ctx);
    const flow = signOAuthIntent({
      host: ctx.hostname,
      actorId: actor?.id,
      actorSessionHash: actor ? getActorSessionHash(actor) : undefined,
      client,
    });

    url.searchParams.delete(FLOW_QUERY_PARAM);
    url.searchParams.set(FLOW_QUERY_PARAM, flow);
    await storeOAuthIntent(flow);

    return ctx.redirect(url.toString());
  }

  const flow = ctx.query[FLOW_QUERY_PARAM];
  if (onApex && typeof flow === "string" && flow) {
    try {
      const intent = verifyOAuthIntent(flow);
      if (await consumeOAuthIntent(flow)) {
        ctx.state.oauthIntent = intent;
      }
    } catch {
      // Invalid or expired intent — proceed without an actor.
      // The user can still complete the OAuth flow as a fresh sign-in.
    }
  }

  return next();
}

/**
 * Passport OAuth state store backed by signed state and a CSRF nonce cookie.
 */
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
    const context = getKoaContext(ctx);
    const csrfNonce = crypto.randomBytes(16).toString("hex");

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
    const client =
      context.state.oauthIntent?.client ?? getClientFromInput(context);
    const host =
      context.state.oauthIntent?.host ??
      context.query.host?.toString() ??
      parseDomain(context.hostname).host;
    const actorId =
      context.state.oauthIntent?.actorId ?? getAuthenticatedUserId(context);
    const actorSessionHash =
      context.state.oauthIntent?.actorSessionHash ??
      getAuthenticatedUserSessionHash(context);
    const state = signOAuthState({
      host,
      actorId,
      actorSessionHash,
      client,
      codeVerifier,
      nonceHash: hashOAuthStateNonce(csrfNonce),
    });

    context.cookies.set(OAUTH_CSRF_COOKIE, csrfNonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(context.hostname, env.isCloudHosted),
    });

    callback(null, state);
  };

  verify = (
    ctx: Context,
    providedToken: string,
    callback: StateStoreVerifyCallback
  ) => {
    const context = getKoaContext(ctx);
    const csrfNonce = context.cookies.get(OAUTH_CSRF_COOKIE);
    context.cookies.set(OAUTH_CSRF_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(context.hostname, env.isCloudHosted),
    });

    let state;
    try {
      state = verifyOAuthState(providedToken);
    } catch (err) {
      return callback(err, false, providedToken);
    }

    if (!safeEqual(hashOAuthStateNonce(csrfNonce ?? ""), state.nonceHash)) {
      return callback(
        OAuthStateMismatchError("OAuth CSRF nonce mismatched"),
        false,
        providedToken
      );
    }

    context.state.oauthState = state;

    // @ts-expect-error Type in library is wrong
    callback(null, state.codeVerifier ?? true, providedToken);
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

/**
 * Parses the state string into its components.
 *
 * @param state The state string
 * @returns An object containing the parsed components, if valid.
 */
export function parseState(state: string) {
  try {
    return verifyOAuthState(state);
  } catch {
    return undefined;
  }
}

/**
 * Returns the client type from the context if available. Used to redirect
 * the user back to the correct client after the OAuth flow.
 *
 * @param ctx The Koa context
 * @returns The client type, defaults to Client.Web
 */
export function getClientFromOAuthState(ctx: Context): Client {
  const context = getKoaContext(ctx);
  const client = context.state.oauthState?.client;
  return client === Client.Desktop ? Client.Desktop : Client.Web;
}

/**
 * Returns the actor referenced by verified OAuth state, if available. This is
 * used to restore the originating user during the OAuth flow when connecting
 * additional providers to an existing team.
 *
 * @param ctx The Koa context
 * @returns The actor if available, otherwise undefined
 */
export async function getUserFromOAuthState(ctx: Context) {
  const context = getKoaContext(ctx);
  const state = context.state.oauthState;
  if (!state?.actorId || !state.actorSessionHash) {
    return undefined;
  }

  const user = await User.scope("withTeam").findByPk(state.actorId);
  if (!user) {
    return undefined;
  }

  if (!safeEqual(getActorSessionHash(user), state.actorSessionHash)) {
    return undefined;
  }

  return user;
}

type TeamFromContextOptions = {
  /**
   * Whether to consider OAuth state in the context when determining the team.
   * If true, OAuth state will be used to determine the host and infer the team
   * this should only be used in the authentication process.
   */
  includeOAuthState?: boolean;
  /**
   * Whether to consider the host query parameter in the context when determining the team.
   * If true, the host query parameter will be used to determine the host and infer the team
   */
  includeHostQueryParam?: boolean;
};

/**
 * Infers the team from the context based on the hostname or OAuth state.
 *
 * @param ctx The Koa context
 * @param options Options for determining the team
 * @returns The inferred team or undefined if not found
 */
export async function getTeamFromContext(
  ctx: Context,
  options: TeamFromContextOptions = { includeOAuthState: true }
) {
  const context = getKoaContext(ctx);
  // "domain" is the domain the user came from when attempting auth
  // we use it to infer the team they intend on signing into
  const includeOAuthState = options.includeOAuthState ?? true;
  const state = includeOAuthState
    ? (context.state.oauthState ?? context.state.oauthIntent)
    : undefined;
  const queryHost =
    options.includeHostQueryParam && typeof context.query.host === "string"
      ? context.query.host
      : undefined;
  const host = state?.host ?? queryHost ?? context.hostname;
  const domain = parseDomain(host);

  let team;
  if (!env.isCloudHosted) {
    if (env.ENVIRONMENT === "test") {
      team = await Team.findByDomain(env.URL);
    } else {
      team = await Team.findOne({
        order: [["createdAt", "DESC"]],
      });
    }
  } else if (context.state?.rootShare) {
    team = await Team.findByPk(context.state.rootShare.teamId);
  } else if (domain.custom) {
    team = await Team.findByDomain(domain.host);
  } else if (domain.teamSubdomain) {
    team = await Team.findBySubdomain(domain.teamSubdomain);
  }

  return team;
}

function getClientFromInput(ctx: Context): Client {
  const clientInput = ctx.query.client?.toString();
  return clientInput === Client.Desktop ? Client.Desktop : Client.Web;
}

function getAuthenticatedUser(ctx: Context): User | undefined {
  return ctx.state.auth && "user" in ctx.state.auth
    ? ctx.state.auth.user
    : undefined;
}

function getAuthenticatedUserId(ctx: Context): string | undefined {
  return getAuthenticatedUser(ctx)?.id;
}

function getAuthenticatedUserSessionHash(ctx: Context): string | undefined {
  const user = getAuthenticatedUser(ctx);
  return user ? getActorSessionHash(user) : undefined;
}

async function getOAuthActor(ctx: Context): Promise<User | undefined> {
  const authenticatedUser = getAuthenticatedUser(ctx);
  if (authenticatedUser) {
    return authenticatedUser;
  }

  const accessToken = ctx.cookies.get("accessToken");
  if (!accessToken) {
    return undefined;
  }

  try {
    const { user } = await getUserForJWT(accessToken);
    return user;
  } catch {
    return undefined;
  }
}

function getActorSessionHash(user: User): string {
  return crypto
    .scryptSync(
      user.jwtSecret,
      `oauth-actor-session:${env.SECRET_KEY}:${user.id}`,
      ACTOR_SESSION_HASH_KEYLEN
    )
    .toString("hex");
}

async function storeOAuthIntent(token: string): Promise<void> {
  await Redis.defaultClient.set(
    getOAuthIntentKey(token),
    "1",
    "EX",
    OAUTH_INTENT_TTL_SECONDS
  );
}

async function consumeOAuthIntent(token: string): Promise<boolean> {
  const result = await Redis.defaultClient.getdel(getOAuthIntentKey(token));
  return result === "1";
}

function getOAuthIntentKey(token: string): string {
  return `${OAUTH_INTENT_PREFIX}${hash(token)}`;
}

function getKoaContext(ctx: Context): Context {
  return (ctx as Context & { ctx?: Context }).ctx ?? ctx;
}
