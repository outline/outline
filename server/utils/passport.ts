import crypto from "crypto";
import { addMinutes, subMinutes } from "date-fns";
import fetch from "fetch-with-proxy";
import { Context } from "koa";
import { OAuthStateMismatchError } from "../errors";
import { getCookieDomain } from "./domains";

export class StateStore {
  key = "state";

  store = (
    ctx: Context,
    callback: (err: Error | null, state: string) => void
  ) => {
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
    ctx: Context,
    providedState: string,
    callback: (err: Error | null, success?: boolean) => void
  ) => {
    const state = ctx.cookies.get(this.key);

    if (!state) {
      return callback(
        OAuthStateMismatchError("State not return in OAuth flow")
      );
    }

    ctx.cookies.set(this.key, "", {
      httpOnly: false,
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(ctx.hostname),
    });

    if (state !== providedState) {
      return callback(OAuthStateMismatchError());
    }

    callback(null, true);
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
