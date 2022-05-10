import crypto from "crypto";
import { addMinutes, subMinutes } from "date-fns";
import type { Request } from "express";
import fetch from "fetch-with-proxy";
import {
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from "passport-oauth2";
import { getCookieDomain } from "@shared/utils/domains";
import { OAuthStateMismatchError } from "../errors";

export class StateStore {
  key = "state";

  store = (ctx: Request, callback: StateStoreStoreCallback) => {
    // Produce a random string as state
    const state = crypto.randomBytes(8).toString("hex");

    ctx.cookies.set(this.key, state, {
      httpOnly: false,
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(ctx.hostname),
    });

    callback(null, state);
  };

  verify = (
    ctx: Request,
    providedState: string,
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

    ctx.cookies.set(this.key, "", {
      httpOnly: false,
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(ctx.hostname),
    });

    if (state !== providedState) {
      return callback(OAuthStateMismatchError(), false, state);
    }

    // @ts-expect-error Type in library is wrong
    callback(null, true, state);
  };
}

export async function request(endpoint: string, accessToken: string) {
  const response = await fetch(endpoint, {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
}
