import { Client } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import env from "~/env";
import Desktop from "~/utils/Desktop";

/**
 * If we're on a custom domain or a subdomain then the auth must point to the
 * apex (env.URL) for authentication so that the state cookie can be set and read.
 * We pass the host into the auth URL so that the server can redirect on error
 * and keep the user on the same page.
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
