import type { AuthenticationProviderSettings } from "@shared/types";
import Logger from "@server/logging/Logger";
import type {
  GroupSyncProvider,
  ExternalGroupData,
} from "@server/utils/GroupSyncProvider";

interface DirectoryGroup {
  id: string;
  name: string;
  email: string;
}

interface DirectoryGroupsResponse {
  groups?: DirectoryGroup[];
  nextPageToken?: string;
}

/**
 * Google Workspace implementation of GroupSyncProvider. Uses the
 * Google Admin Directory API to fetch the user's group memberships.
 *
 * Requires the scope:
 * https://www.googleapis.com/auth/admin.directory.group.readonly
 */
export default class GoogleGroupSyncProvider implements GroupSyncProvider {
  /**
   * Fetch the groups a user belongs to from Google Workspace using the
   * Admin Directory API.
   *
   * @param accessToken - the user's OAuth access token.
   * @param _settings - provider settings (unused for Google).
   * @returns array of external groups the user is a member of.
   */
  async fetchUserGroups(
    accessToken: string,
    _settings: AuthenticationProviderSettings
  ): Promise<ExternalGroupData[]> {
    // Resolve the user's email from the access token since the
    // Directory API does not support "me" as a userKey.
    const userInfo = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!userInfo.ok) {
      Logger.warn("Google group sync: failed to fetch userinfo", {
        status: userInfo.status,
      });
      return [];
    }

    const { email } = (await userInfo.json()) as { email: string };
    if (!email) {
      return [];
    }

    const results: ExternalGroupData[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(
        "https://www.googleapis.com/admin/directory/v1/groups"
      );
      url.searchParams.set("userKey", email);
      url.searchParams.set("maxResults", "200");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        Logger.debug(
          "authentication",
          "Google group sync: Directory API response",
          {
            message: await response.text(),
            status: response.status,
            url: url.toString(),
          }
        );
        Logger.warn("Google group sync: Directory API returned non-OK status", {
          status: response.status,
        });
        return results;
      }

      const data: DirectoryGroupsResponse = await response.json();

      for (const group of data.groups ?? []) {
        results.push({
          id: group.id,
          name: group.name,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return results;
  }
}
