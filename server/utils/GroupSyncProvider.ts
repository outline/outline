import type { AuthenticationProviderSettings } from "@shared/types";

/**
 * Represents a group reported by an external authentication provider.
 */
export interface ExternalGroupData {
  /** Unique identifier for the group in the provider's system. */
  id: string;
  /** Display name of the group. */
  name: string;
}

/**
 * Interface that authentication provider plugins implement to support
 * group synchronization.
 */
export interface GroupSyncProvider {
  /**
   * Fetch the groups that a user belongs to from the external provider.
   *
   * @param accessToken - the user's OAuth access token.
   * @param settings - provider-specific settings from AuthenticationProvider.settings.
   * @returns array of external groups the user is a member of.
   */
  fetchUserGroups(
    accessToken: string,
    settings: AuthenticationProviderSettings
  ): Promise<ExternalGroupData[]>;
}
