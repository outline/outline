import { addMonths } from "date-fns";
import isUUID from "validator/lib/isUUID";
import { z } from "zod";

/** Details of a workspace recorded in the sessions cookie. */
export interface Session {
  name: string;
  logoUrl: string | null;
  url: string;
  expiresAt?: string;
  lastUsedAt?: string;
}

/** Workspace sessions indexed by team ID. */
export type Sessions = Record<string, Session>;

/**
 * Parses a decoded sessions cookie, discarding malformed entries.
 *
 * @param value the decoded cookie value.
 * @returns the valid session entries.
 */
export function parseSessionsCookie(value: string): Sessions {
  try {
    const parsed = sessionsSchema.safeParse(JSON.parse(value));
    if (!parsed.success) {
      return {};
    }

    const sessions: Sessions = {};
    for (const [id, value] of Object.entries(parsed.data)) {
      if (!isUUID(id)) {
        continue;
      }

      const session = sessionSchema.safeParse(value);
      if (session.success) {
        sessions[id] = session.data;
      }
    }
    return sessions;
  } catch (_err) {
    return {};
  }
}

/**
 * Checks whether a remembered workspace has an active session.
 * Legacy entries without an expiry are treated as signed in until reconciled.
 *
 * @param session the remembered workspace session.
 * @returns whether the session has not expired.
 */
export function isSessionActive(session: Session): boolean {
  return (
    session.expiresAt === undefined ||
    Date.parse(session.expiresAt) > Date.now()
  );
}

/**
 * Selects active sessions without removing remembered workspaces from storage.
 *
 * @param sessions the sessions to filter.
 * @returns the active sessions.
 */
export function getActiveSessions(sessions: Sessions): Sessions {
  return Object.fromEntries(
    Object.entries(sessions).filter(([, session]) => isSessionActive(session))
  );
}

/**
 * Keeps workspaces used in the last three months, dating legacy entries on first read.
 *
 * @param sessions the remembered workspace sessions.
 * @returns the recently used workspaces.
 */
export function getRememberedSessions(sessions: Sessions): Sessions {
  const now = new Date();
  return Object.fromEntries(
    Object.entries(sessions)
      .filter(
        ([, session]) =>
          session.lastUsedAt === undefined ||
          addMonths(new Date(session.lastUsedAt), 3).getTime() > now.getTime()
      )
      .map(([id, session]) => [
        id,
        { ...session, lastUsedAt: session.lastUsedAt ?? now.toISOString() },
      ])
  );
}

/**
 * Finds when the last remembered workspace reaches three months of inactivity.
 *
 * @param sessions the remembered workspace sessions.
 * @returns the cookie expiry, or undefined when there are no entries.
 */
export function getSessionsCookieExpiry(sessions: Sessions): Date | undefined {
  const expiresAt = Math.max(
    0,
    ...Object.values(getRememberedSessions(sessions)).map((session) =>
      addMonths(new Date(session.lastUsedAt ?? Date.now()), 3).getTime()
    )
  );
  return expiresAt ? new Date(expiresAt) : undefined;
}

const sessionSchema = z.object({
  name: z.string(),
  logoUrl: z.string().nullable(),
  url: z.string(),
  expiresAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
});

const sessionsSchema = z.record(z.string(), z.unknown());
