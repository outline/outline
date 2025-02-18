import crypto from "crypto";
import { addMinutes, subMinutes } from "date-fns";
import type { Context } from "koa";
// Allowed for trusted server<->server connections
// eslint-disable-next-line no-restricted-imports
import fetch from "node-fetch";
import {
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from "passport-oauth2";
import { Client } from "@shared/types";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import { Team } from "@server/models";
import { InternalError, OAuthStateMismatchError } from "../errors";

export class StateStore {
  key = "state";

  store = (ctx: Context, callback: StateStoreStoreCallback) => {
    // token is a short lived one-time pad to prevent replay attacks
    const token = crypto.randomBytes(8).toString("hex");

    // We expect host to be a team subdomain, custom domain, or apex domain
    // that is passed via query param from the auth provider component.
    const clientInput = ctx.query.client?.toString();
    const client = clientInput === Client.Desktop ? Client.Desktop : Client.Web;
    const host = ctx.query.host?.toString() || parseDomain(ctx.hostname).host;
    const state = buildState(host, token, client);

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
        OAuthStateMismatchError("State not return in OAuth flow"),
        false,
        state
      );
    }

    const { token } = parseState(state);

    // Destroy the one-time pad token and ensure it matches
    ctx.cookies.set(this.key, "", {
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(ctx.hostname, env.isCloudHosted),
    });

    if (!token || token !== providedToken) {
      return callback(OAuthStateMismatchError(), false, token);
    }

    // @ts-expect-error Type in library is wrong
    callback(null, true, state);
  };
}

export async function request(
  method: "GET" | "POST",
  endpoint: string,
  accessToken: string
) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    throw InternalError(
      `Failed to parse response from ${endpoint}. Expected JSON, got: ${text}`
    );
  }
}

function buildState(host: string, token: string, client?: Client) {
  return [host, token, client].join("|");
}

export function parseState(state: string) {
  const [host, token, client] = state.split("|");
  return { host, token, client };
}

export function getClientFromContext(ctx: Context): Client {
  const state = ctx.cookies.get("state");
  const client = state ? parseState(state).client : undefined;
  return client === Client.Desktop ? Client.Desktop : Client.Web;
}

export async function getTeamFromContext(ctx: Context) {
  // "domain" is the domain the user came from when attempting auth
  // we use it to infer the team they intend on signing into
  const state = ctx.cookies.get("state");
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
