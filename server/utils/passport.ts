import crypto from "crypto";
import { addMinutes, subMinutes } from "date-fns";
import fetch from "fetch-with-proxy";
import type { Context } from "koa";
import {
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from "passport-oauth2";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import { Team } from "@server/models";
import { AuthRedirectError, OAuthStateMismatchError } from "../errors";

export class StateStore {
  key = "state";

  store = (ctx: Context, callback: StateStoreStoreCallback) => {
    // token is a short lived one-time pad to prevent replay attacks
    // appDomain is the domain the user originated from when attempting auth
    // we expect it to be a team subdomain, custom domain, or apex domain
    const token = crypto.randomBytes(8).toString("hex");
    const appDomain = parseDomain(ctx.hostname);
    const state = buildState(appDomain.host, token);

    ctx.cookies.set(this.key, state, {
      httpOnly: false,
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(ctx.hostname),
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
        OAuthStateMismatchError("State not return in OAuth flow"),
        false,
        state
      );
    }

    const { host, token } = parseState(state);

    // Oauth callbacks are hard-coded to come to the apex domain, so we
    // redirect to the original app domain before attempting authentication.
    // If there is an error during auth, the user will end up on the same domain
    // that they started from.
    const appDomain = parseDomain(host);
    if (appDomain.host !== parseDomain(ctx.hostname).host) {
      const reqProtocol = ctx.protocol;
      const requestHost = ctx.get("host");
      const requestPath = ctx.originalUrl;
      const requestUrl = `${reqProtocol}://${requestHost}${requestPath}`;
      const url = new URL(requestUrl);

      url.host = appDomain.host;

      return callback(AuthRedirectError(``, url.toString()), false, token);
    }

    // Destroy the one-time pad token and ensure it matches
    ctx.cookies.set(this.key, "", {
      httpOnly: false,
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(ctx.hostname),
    });

    if (!token || token !== providedToken) {
      return callback(OAuthStateMismatchError(), false, token);
    }

    // @ts-expect-error Type in library is wrong
    callback(null, true, state);
  };
}

export async function request(endpoint: string, accessToken: string) {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

function buildState(host: string, token: string) {
  return [host, token].join("|");
}

export function parseState(state: string) {
  const [host, token] = state.split("|");
  return { host, token };
}

export async function getTeamFromContext(ctx: Context) {
  // "domain" is the domain the user came from when attempting auth
  // we use it to infer the team they intend on signing into
  const state = ctx.cookies.get("state");
  const host = state ? parseState(state).host : ctx.hostname;
  const domain = parseDomain(host);

  let team;
  if (env.DEPLOYMENT !== "hosted") {
    team = await Team.findOne();
  } else if (domain.custom) {
    team = await Team.findOne({ where: { domain: domain.host } });
  } else if (env.SUBDOMAINS_ENABLED && domain.teamSubdomain) {
    team = await Team.findOne({
      where: { subdomain: domain.teamSubdomain },
    });
  }

  return team;
}
