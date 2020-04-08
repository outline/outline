// @flow
import * as crypto from 'crypto';
import addHours from 'date-fns/add_hours';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function uniqueId(length: number) {
  const bytes = crypto.pseudoRandomBytes(length);

  let r = [];
  for (let i = 0; i < bytes.length; i++) {
    r.push(CHARS[bytes[i] % CHARS.length]);
  }

  return r.join('');
}

function removeDays(d: Date, x: number): Date {
  d.setDate(d.getDate() - x);
  return d;
}

export type StateStoreOptions = {
  key?: string,
};

function stateStore(options: StateStoreOptions) {
  if (options) {
    this.key = (options && options.key) || 'state';
  }
}

stateStore.prototype.store = function(req: any, callback: any) {
  const state = uniqueId(24);

  req.cookies.set(this.key, state, {
    httpOnly: false,
    expires: addHours(new Date(), 1),
  });

  callback(null, state);
};

stateStore.prototype.verify = function(
  req: any,
  providedState: any,
  callback: any
) {
  const state = req.cookies.get(this.key);
  if (!state) {
    return callback(null, false, {
      message: 'Unable to verify authorization request state.',
    });
  }

  req.cookies.set(this.key, '', {
    httpOnly: false,
    expires: removeDays(new Date(), 1),
  });

  if (state.handle !== providedState) {
    return callback(null, false, {
      message: 'Invalid authorization request state.',
    });
  }

  callback(null, true);
};

export const StateStore = stateStore;
