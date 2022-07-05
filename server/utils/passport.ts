import crypto from "crypto";
import { addMinutes, subMinutes } from "date-fns";
import type { Request } from "express";
import fetch from "fetch-with-proxy";
import {
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from "passport-oauth2";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import { AuthRedirectError, OAuthStateMismatchError } from "../errors";

export class StateStore {
  key = "state";

  store = (req: Request, callback: StateStoreStoreCallback) => {
    // token is a short lived one-time pad to prevent replay attacks
    // appDomain is the domain the user originated from when attempting auth
    // we expect it to be a team subdomain, custom domain, or apex domain
    const token = crypto.randomBytes(8).toString("hex");
    const appDomain = parseDomain(req.hostname);
    const state = buildState(appDomain.host, token);

    req.cookies.set(this.key, state, {
      httpOnly: false,
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(req.hostname),
    });

    callback(null, token);
  };

  verify = (
    req: Request,
    providedToken: string,
    callback: StateStoreVerifyCallback
  ) => {
    const state = req.cookies.get(this.key);

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
    if (appDomain.host !== parseDomain(req.hostname).host) {
      const reqProtocol = req.protocol;
      const requestHost = req.get("host");
      const requestPath = req.originalUrl;
      const requestUrl = `${reqProtocol}://${requestHost}${requestPath}`;
      const url = new URL(requestUrl);

      url.host = appDomain.host;

      return callback(AuthRedirectError(``, url.toString()), false, token);
    }

    // Destroy the one-time pad token and ensure it matches
    req.cookies.set(this.key, "", {
      httpOnly: false,
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(req.hostname),
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
