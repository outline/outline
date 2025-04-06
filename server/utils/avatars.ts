import crypto from "crypto";
import fetch from "./fetch";

export async function generateAvatarUrl({
  id,
  domain,
}: {
  id: string;
  domain?: string;
}) {
  // Clearbit API is being discontinued, so we're removing this functionality
  // and always returning null to allow the application to fall back to its
  // default avatar generation mechanism
  return null;
}
