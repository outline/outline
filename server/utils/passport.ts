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
import { OAuthStateMismatchError } from "../errors";

export class StateStore {
  key = "state";

  store = (ctx: Context, callback: StateStoreStoreCallback) => {
    // token is a short lived one-time pad to prevent replay attacks
    const token = crypto.randomBytes(8).toString("hex");

    // We expect host to be a team subdomain, custom domain, or apex domain
    // that is passed via query param from the auth provider component.
    const host = ctx.query.host?.toString() || parseDomain(ctx.hostname).host;
    const state = buildState(host, token);

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

    const { token } = parseState(state);

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
