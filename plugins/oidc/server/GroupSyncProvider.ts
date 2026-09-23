import type {
  ExternalGroupData,
  GroupSyncProvider,
} from "@server/utils/GroupSyncProvider";
import type { AuthenticationProviderSettings } from "@shared/types";
import fetch from "@server/utils/fetch";
import { parseUserInfoResponse } from "@server/utils/oauth";
import env from "./env";

export const OIDCGroupSyncProvider: GroupSyncProvider = {
  useGroupClaim: true,

  async fetchUserGroups(
    accessToken: string,
    settings: AuthenticationProviderSettings
  ): Promise<ExternalGroupData[]> {
    const response = await fetch(env.OIDC_USERINFO_URI!, {
      method: "GET",
      allowPrivateIPAddress: true,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const profile =
      await parseUserInfoResponse<Record<string, unknown>>(response);
    const value = profile[settings.groupClaim || "groups"];

    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((entry) => ({
      id: String(entry),
      name: String(entry),
    }));
  },
};
