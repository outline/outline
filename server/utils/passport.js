// @flow
import addMinutes from "date-fns/add_minutes";
import subMinutes from "date-fns/sub_minutes";
import { type Request } from "koa";
import { OAuthStateMismatchError } from "../errors";
import { getCookieDomain } from "./domains";

export class StateStore {
  key: string = "state";

  store = (req: Request, callback: (err: ?Error, state?: string) => void) => {
    const state = Math.random().toString(36).substring(7);

    // $FlowFixMe
    req.cookies.set(this.key, state, {
      httpOnly: false,
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(req.hostname),
    });

    callback(null, state);
  };

  verify = (
    req: Request,
    providedState: string,
    callback: (err: ?Error, ?boolean) => void
  ) => {
    // $FlowFixMe
    const state = req.cookies.get(this.key);
    if (!state) {
      return callback(
        new OAuthStateMismatchError("State not return in OAuth flow")
      );
    }

    // $FlowFixMe
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
