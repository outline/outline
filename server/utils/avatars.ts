import crypto from "crypto";
import fetch from "./fetch";

export async function generateAvatarUrl({
  id,
  domain,
}: {
  id: string;
  domain?: string;
}) {
  // attempt to get logo from Clearbit API. If one doesn't exist then
  // fall back to using tiley to generate a placeholder logo
  const hash = crypto.createHash("sha256");
  hash.update(id);
  let cbResponse, cbUrl;

  if (domain) {
    cbUrl = `https://logo.clearbit.com/${domain}`;

    try {
      cbResponse = await fetch(cbUrl);
    } catch (err) {
      // okay
    }
  }

  return cbUrl && cbResponse && cbResponse.status === 200 ? cbUrl : null;
}
