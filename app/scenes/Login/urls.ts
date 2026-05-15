import Desktop from "~/utils/Desktop";

function validateAndEncodeSubdomain(subdomain: string): string {
  const encodedSubdomain = encodeURIComponent(subdomain);
  const urlPattern = /^[a-z\d-]{1,63}$/;
  if (!urlPattern.test(encodedSubdomain)) {
    throw new Error("Invalid subdomain");
  }
  return `https://${encodedSubdomain}.getoutline.com`;
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
  const host = validateAndEncodeSubdomain(normalizedSubdomain);
  await Desktop.bridge?.addCustomHost(host);
  window.location.href = host;
}
