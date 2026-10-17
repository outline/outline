import isUUID from "validator/lib/isUUID";
import { z } from "zod";

/** Details of a workspace recorded in the sessions cookie. */
export interface Session {
  name: string;
  logoUrl: string | null;
  url: string;
  expiresAt?: string;
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
 * Removes expired sessions and optionally assigns an expiry to legacy entries.
 *
 * @param sessions the sessions to filter.
 * @param legacyExpiry the expiry to assign to entries without one.
 * @returns the active sessions.
 */
export function getActiveSessions(
  sessions: Sessions,
  legacyExpiry?: Date
): Sessions {
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(sessions)
      .filter(
        ([, session]) =>
          session.expiresAt === undefined || Date.parse(session.expiresAt) > now
      )
      .map(([id, session]) => [
        id,
        session.expiresAt === undefined && legacyExpiry
          ? { ...session, expiresAt: legacyExpiry.toISOString() }
          : session,
      ])
  );
}

/**
 * Finds the latest expiry among the session entries.
 *
 * @param sessions the sessions with individual expiry dates.
 * @returns the cookie expiry, or undefined when there are no dated entries.
 */
export function getSessionsCookieExpiry(sessions: Sessions): Date | undefined {
  const expiresAt = Math.max(
    0,
    ...Object.values(sessions).map((session) =>
      session.expiresAt ? Date.parse(session.expiresAt) : 0
    )
  );
  return expiresAt ? new Date(expiresAt) : undefined;
}

const sessionSchema = z.object({
  name: z.string(),
  logoUrl: z.string().nullable(),
  url: z.string(),
  expiresAt: z.string().optional(),
});

const sessionsSchema = z.record(z.string(), z.unknown());
