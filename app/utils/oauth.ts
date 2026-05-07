import { setCookie } from "tiny-cookie";
import { randomString } from "@shared/random";

/**
 * Generate a random nonce, persist it in a same-origin cookie, and return it
 * for embedding in the `state` parameter of an outbound OAuth flow.
 *
 * The callback handler must read the same cookie and timing-safe-compare it
 * against the nonce on the returned state.
 *
 * @param cookieName The cookie used to persist the nonce, unique per provider.
 * @returns The generated nonce.
 */
export function generateOAuthStateNonce(cookieName: string): string {
  const nonce = randomString(32);
  setCookie(cookieName, nonce, {
    path: "/",
    "max-age": 600,
    samesite: "Lax",
    secure: window.location.protocol === "https:",
  });
  return nonce;
}
