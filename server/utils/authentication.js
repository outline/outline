// @flow

export function getAllowedDomains(): string[] {
  // GOOGLE_ALLOWED_DOMAINS included here for backwards compatability
  const env = process.env.ALLOWED_DOMAINS || process.env.GOOGLE_ALLOWED_DOMAINS;
  return env ? env.split(",") : [];
}
