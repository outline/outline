import { getCookie } from "tiny-cookie";
import { CSRF } from "@shared/constants";

/**
 * Reads the CSRF token that the server attached to the current document,
 * preferring the host-bound cookie when present.
 *
 * @returns The token, or an empty string when no CSRF cookie is present.
 */
export function getCSRFToken(): string {
  return getCookie(CSRF.secureCookieName) ?? getCookie(CSRF.cookieName) ?? "";
}
