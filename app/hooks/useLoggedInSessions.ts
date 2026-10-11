import { getCookie } from "tiny-cookie";
import type { Sessions } from "@shared/utils/sessions";
import { getActiveSessions, parseSessionsCookie } from "@shared/utils/sessions";

export type { Sessions } from "@shared/utils/sessions";

/**
 * Reads workspace sessions for the chooser, excluding expired entries.
 *
 * @returns the active workspace sessions.
 */
export function useLoggedInSessions(): Sessions {
  return getActiveSessions(parseSessionsCookie(getCookie("sessions") || "{}"));
}
