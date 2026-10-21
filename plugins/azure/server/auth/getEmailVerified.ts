/**
 * Determines whether Microsoft has verified the resolved email address.
 *
 * @param email the email address selected for sign-in.
 * @param profile the claims from the ID token.
 * @param userPrincipalName the user principal name from Microsoft Graph.
 * @returns the verification status, or undefined if no proof is available.
 */
export function getEmailVerified(
  email: string,
  profile: EmailVerificationClaims,
  userPrincipalName?: string | null
): boolean | undefined {
  // Unlike the editable Graph `mail` field, the UPN belongs to a domain
  // verified by the tenant. Only trust it when the full address matches.
  if (userPrincipalName?.toLowerCase() === email.toLowerCase()) {
    return true;
  }

  // Verification claims apply to the token's email, not a Graph fallback.
  if (profile.email?.toLowerCase() !== email.toLowerCase()) {
    return undefined;
  }

  const verificationClaims = [profile.xms_edov, profile.email_verified].filter(
    (claim) => claim !== undefined
  );

  return verificationClaims.length
    ? verificationClaims.some((claim) => claim === true || claim === "true")
    : undefined;
}

interface EmailVerificationClaims {
  email?: string;
  xms_edov?: boolean | string;
  email_verified?: boolean | string;
}
