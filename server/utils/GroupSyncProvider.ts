import type { AuthenticationProviderSettings } from "@shared/types";
import type { AuthenticationProvider, User } from "@server/models";

/**
 * Represents a group reported by an external authentication provider.
 */
export interface ExternalGroupData {
  /** Unique identifier for the group in the provider's system. */
  id: string;
  /** Display name of the group. */
  name: string;
  /**
   * Description of the group, if the provider exposes one. `undefined` means
   * the provider does not report descriptions and the internal value is left
   * untouched, while `null` or an empty string clears it.
   */
  description?: string | null;
}

/**
 * Interface that authentication provider plugins implement to support
 * group synchronization.
 */
export interface GroupSyncProvider {
  /** Whether this provider requires a configurable group claim path. */
  useGroupClaim: boolean;

  /**
   * Starts provider-specific group sync setup when administrator consent is required.
   *
   * @param authenticationProvider - the provider being configured.
   * @param actor - the workspace administrator starting setup.
   * @returns the URL where the administrator should complete setup.
   */
  startGroupSync?(
    authenticationProvider: AuthenticationProvider,
    actor: User
  ): Promise<string>;

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
