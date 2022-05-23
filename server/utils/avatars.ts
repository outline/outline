import crypto from "crypto";
import fetch from "fetch-with-proxy";
import env from "@server/env";

export async function generateAvatarUrl({
  id,
  domain,
  name = "Unknown",
}: {
  id: string;
  domain?: string;
  name?: string;
}) {
  // attempt to get logo from Clearbit API. If one doesn't exist then
  // fall back to using tiley to generate a placeholder logo
  const hash = crypto.createHash("sha256");
  hash.update(id);
  const hashedId = hash.digest("hex");
  let cbResponse, cbUrl;

  if (domain) {
    cbUrl = `https://logo.clearbit.com/${domain}`;

    try {
      cbResponse = await fetch(cbUrl);
    } catch (err) {
      // okay
    }
  }

  const tileyUrl = `${
    env.DEFAULT_AVATAR_HOST
  }/avatar/${hashedId}/${encodeURIComponent(name[0])}.png`;
  return cbUrl && cbResponse && cbResponse.status === 200 ? cbUrl : tileyUrl;
}
