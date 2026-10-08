import { getBaseDomain } from "@shared/utils/domains";
import useStores from "./useStores";

interface EmailInboxLink {
  provider: "gmail" | "outlook";
  href: string;
}

/**
 * Builds inbox links for the likely email providers, with search where supported.
 *
 * @param email the address that received the sign-in link.
 * @returns inbox links, including both providers when the context is unclear.
 */
export function useEmailInboxLinks(email: string): EmailInboxLink[] {
  const { auth } = useStores();
  const providers = auth.config?.name ? auth.config.providers : [];
  const domain = email.trim().toLowerCase().split("@").pop();
  const isGmail = domain === "gmail.com" || domain === "googlemail.com";
  const isOutlook = ["outlook.com", "hotmail.com", "live.com", "msn.com"].some(
    (value) => value === domain
  );
  const hasGoogle = providers.some((provider) => provider.id === "google");
  const hasMicrosoft = providers.some((provider) => provider.id === "azure");
  const links: EmailInboxLink[] = [];
  const senderQuery = `from:(${getBaseDomain()})`;

  if (isGmail || (!isOutlook && (!hasMicrosoft || hasGoogle))) {
    links.push({
      provider: "gmail",
      href: `https://mail.google.com/mail/?authuser=${encodeURIComponent(email.trim())}#search/${encodeURIComponent(`in:anywhere ${senderQuery}`)}`,
    });
  }

  if (isOutlook || (!isGmail && (!hasGoogle || hasMicrosoft))) {
    const origin = isOutlook
      ? "https://outlook.live.com"
      : "https://outlook.office.com";
    links.push({
      provider: "outlook",
      // Outlook does not support a reliable search URL. Open the recipient's
      // mailbox rather than a search route that may fail or ignore the query.
      href: `${origin}/mail/?login_hint=${encodeURIComponent(email.trim())}`,
    });
  }

  return links;
}
