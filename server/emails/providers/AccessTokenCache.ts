import { InternalError } from "@server/errors";
import fetch from "@server/utils/fetch";

/** An access token and the time at which it stops being usable. */
export interface AccessToken {
  /** The bearer token value. */
  value: string;
  /** When the token expires, in milliseconds since the epoch. */
  expiresAt: number;
}

/**
 * Requests an access token from an OAuth token endpoint using form-encoded
 * parameters, with shared handling of the token expiry.
 *
 * @param endpoint The token endpoint URL.
 * @param params Form parameters for the grant being requested.
 * @param errorMessage Context prefixed to the error when the request fails.
 * @returns the token and its expiry.
 * @throws if the endpoint rejects the request.
 */
export async function fetchAccessToken(
  endpoint: string,
  params: Record<string, string>,
  errorMessage: string
): Promise<AccessToken> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    throw InternalError(
      `${errorMessage} (${response.status}): ${await response.text()}`
    );
  }

  const data = await response.json();

  // expires_in is only recommended by the OAuth spec, so fall back to a
  // conservative lifetime when the response omits it rather than treating
  // the token as already expired.
  const expiresIn = Number(data.expires_in);

  return {
    value: data.access_token,
    // Expire a minute early so a token is never used as it lapses.
    expiresAt:
      Date.now() +
      (Number.isFinite(expiresIn) ? Math.max(expiresIn - 60, 0) : 300) * 1000,
  };
}

/**
 * Caches short-lived access tokens, one per key, and collapses concurrent
 * requests for the same key into a single request.
 *
 * Email providers that authenticate over OAuth need a token for every send, at
 * a rate that would otherwise mean a token request per email.
 */
export class AccessTokenCache {
  /**
   * @param requestToken Called to obtain a token when none is cached, or when
   * the cached token has expired.
   */
  constructor(private requestToken: (key: string) => Promise<AccessToken>) {}

  /**
   * Returns a usable access token for the given key.
   *
   * @param key Identifies the token, for example the tenant or mailbox it was
   * issued for.
   * @returns a token that has not expired.
   * @throws if a token could not be obtained.
   */
  public async get(key: string): Promise<string> {
    for (;;) {
      const pending = this.tokens.get(key);

      if (pending) {
        // A rejected request reads as absent, and is replaced below.
        const token = await pending.catch(() => undefined);
        if (token && token.expiresAt > Date.now()) {
          return token.value;
        }

        // The awaited entry is stale. If another caller already replaced it
        // while this one was waiting, use the replacement rather than making
        // a competing request.
        if (this.tokens.get(key) !== pending) {
          continue;
        }
      }

      // Claim the slot synchronously – there is no await between the check
      // above and this set, so concurrent callers coalesce onto one request.
      const request = this.requestToken(key);
      this.tokens.set(key, request);

      try {
        return (await request).value;
      } catch (err) {
        if (this.tokens.get(key) === request) {
          this.tokens.delete(key);
        }
        throw err;
      }
    }
  }

  private tokens = new Map<string, Promise<AccessToken>>();
}
