import { addMinutes, subMinutes } from "date-fns";
import fetch from "fetch-with-proxy";
import type { Request } from "koa";
import "koa";
import { OAuthStateMismatchError } from "../errors";
import { getCookieDomain } from "./domains";

export class StateStore {
  key = "state";

  store = (req: Request, callback: () => void) => {
    // Produce an 8-character random string as state
    const state = Math.random().toString(36).slice(-8);

    req.cookies.set(this.key, state, {
      httpOnly: false,
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(req.hostname),
    });
    callback(null, state);
  };

  verify = (req: Request, providedState: string, callback: () => void) => {
    const state = req.cookies.get(this.key);

    if (!state) {
      return callback(
        new OAuthStateMismatchError("State not return in OAuth flow")
      );
    }

    req.cookies.set(this.key, "", {
      httpOnly: false,
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(req.hostname),
    });

    if (state !== providedState) {
      return callback(new OAuthStateMismatchError());
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
