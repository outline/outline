/**
 * Parse an email address into its local and domain parts.
 *
 * @param email The email address to parse
 * @returns The local and domain parts of the email address, in lowercase
 */
export function parseEmail(email: string): { local: string; domain: string } {
  const [local, domain] = email.toLowerCase().split("@");

  if (!domain) {
    throw new Error("Invalid email address");
  }

  return { local, domain };
}
