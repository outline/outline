import { Client } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import env from "~/env";
import Desktop from "~/utils/Desktop";

/**
 * If we're on a custom domain or a subdomain then the auth must point to the
 * apex (env.URL) for authentication so that the state cookie can be set and read.
 * We pass the host into the auth URL so that the server can redirect on error
 * and keep the user on the same page.
 *
 * @param authUrl The URL to redirect to after authentication
 */
export function getRedirectUrl(authUrl: string) {
  const { custom, teamSubdomain, host } = parseDomain(window.location.origin);
  const url = new URL(env.URL);
  url.pathname = authUrl;

  if (custom || teamSubdomain) {
    url.searchParams.set("host", host);
  }
  if (Desktop.isElectron()) {
    url.searchParams.set("client", Client.Desktop);
  }

  return url.toString();
}

/**
 * Redirect to a subdomain, adding it to the custom hosts list on desktop first.
 *
 * @param subdomain The subdomain to navigate to
 */
export async function navigateToSubdomain(subdomain: string) {
  const normalizedSubdomain = subdomain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "");
  const host = `https://${normalizedSubdomain}.getoutline.com`;
  await Desktop.bridge?.addCustomHost(host);
  window.location.href = host;
}
