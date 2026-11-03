import { getCookie } from "tiny-cookie";
import type { Sessions } from "@shared/utils/sessions";
import {
  getRememberedSessions,
  parseSessionsCookie,
} from "@shared/utils/sessions";

export type { Sessions } from "@shared/utils/sessions";

/**
 * Reads workspaces used in the last three months, including logged-out entries.
 *
 * @returns the remembered workspace sessions.
 */
export function useWorkspaceSessions(): Sessions {
  return getRememberedSessions(
    parseSessionsCookie(getCookie("sessions") || "{}")
  );
}
