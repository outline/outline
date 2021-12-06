import crypto from "crypto";
import { addMinutes, subMinutes } from "date-fns";
import fetch from "fetch-with-proxy";
import { Request } from "koa";
import { OAuthStateMismatchError } from "../errors";
import { getCookieDomain } from "./domains";

export class StateStore {
  key = "state";

  store = (req: Request, callback: () => void) => {
    // Produce a random string as state
    const state = crypto.randomBytes(8).toString("hex");

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'cookies' does not exist on type 'Request... Remove this comment to see the full error message
    req.cookies.set(this.key, state, {
      httpOnly: false,
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(req.hostname),
    });
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 2.
    callback(null, state);
  };

  verify = (req: Request, providedState: string, callback: () => void) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'cookies' does not exist on type 'Request... Remove this comment to see the full error message
    const state = req.cookies.get(this.key);

    if (!state) {
      return callback(
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
        new OAuthStateMismatchError("State not return in OAuth flow")
      );
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'cookies' does not exist on type 'Request... Remove this comment to see the full error message
    req.cookies.set(this.key, "", {
      httpOnly: false,
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(req.hostname),
    });

    if (state !== providedState) {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
      return callback(new OAuthStateMismatchError());
    }

    // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 2.
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
