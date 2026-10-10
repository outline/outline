import { isPlainObject, pickBy } from "es-toolkit";
import { getCookie } from "tiny-cookie";

export type Sessions = Record<
  string,
  {
    name: string;
    logoUrl: string;
    url: string;
  }
>;

/**
 * Returns the workspaces that the browser is signed in to, as recorded in the
 * "sessions" cookie on the apex domain. Malformed cookie values are ignored.
 *
 * @returns the sessions keyed by team id.
 */
export function useLoggedInSessions(): Sessions {
  try {
    const sessions = JSON.parse(getCookie("sessions") || "{}");
    if (!isPlainObject(sessions)) {
      return {};
    }

    return pickBy(
      sessions,
      (session) =>
        isPlainObject(session) &&
        typeof session.name === "string" &&
        typeof session.url === "string"
    );
  } catch (_err) {
    return {};
  }
}
