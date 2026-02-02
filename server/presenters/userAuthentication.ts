import type UserAuthentication from "@server/models/UserAuthentication";

export type UserAuthenticationPresentation = {
  id: string;
  provider: {
    id: string;
    name: string;
    providerId: string;
  };
  providerId: string;
  scopes: string[];
  profile: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * Present a user authentication record for API responses.
 *
 * @param authentication The authentication record to present.
 * @returns The presented authentication record.
 */
export default function presentUserAuthentication(
  authentication: UserAuthentication
): UserAuthenticationPresentation {
  return {
    id: authentication.id,
    provider: {
      id: authentication.authenticationProvider.id,
      name: authentication.authenticationProvider.name,
      providerId: authentication.authenticationProvider.providerId,
    },
    providerId: authentication.providerId,
    scopes: authentication.scopes,
    profile: authentication.profile ?? null,
    createdAt: authentication.createdAt.toISOString(),
  };
}
