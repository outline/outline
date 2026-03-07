import get from "lodash/get";
import type { AuthenticationProviderSettings } from "@shared/types";
import type {
  GroupSyncProvider,
  ExternalGroupData,
} from "@server/utils/GroupSyncProvider";
import { request } from "@server/utils/passport";
import env from "./env";

/**
 * OIDC implementation of GroupSyncProvider. Extracts groups from the
 * userinfo endpoint response using the configured claim path.
 */
export default class OIDCGroupSyncProvider implements GroupSyncProvider {
  useGroupClaim = true;

  /**
   * Fetch the groups a user belongs to from the OIDC provider's userinfo
   * endpoint using the configured group claim path.
   *
   * @param accessToken - the user's OAuth access token.
   * @param settings - provider settings containing the groupClaim path.
   * @returns array of external groups the user is a member of.
   */
  async fetchUserGroups(
    accessToken: string,
    settings: AuthenticationProviderSettings
  ): Promise<ExternalGroupData[]> {
    if (!settings.groupClaim) {
      return [];
    }

    const userInfoUri = env.OIDC_USERINFO_URI;
    if (!userInfoUri) {
      return [];
    }

    const profile = await request("GET", userInfoUri, accessToken);

    // Extract groups from the configured claim path (e.g. "groups", "roles")
    const rawGroups = get(profile, settings.groupClaim, []);

    if (!Array.isArray(rawGroups)) {
      return [];
    }

    const results: ExternalGroupData[] = [];

    for (const group of rawGroups) {
      // Handle string arrays: ["engineering", "design"]
      if (typeof group === "string") {
        results.push({ id: group, name: group });
        continue;
      }

      // Handle object arrays: [{id: "123", name: "Engineering"}]
      if (typeof group === "object" && group !== null) {
        const id = group.id ?? group.name;
        const name = group.name ?? group.id;
        if (id && name) {
          results.push({
            id: String(id),
            name: String(name),
          });
        }
      }
    }

    return results;
  }
}
