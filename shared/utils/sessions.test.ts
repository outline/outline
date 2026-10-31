import { addMonths, subDays } from "date-fns";
import type { Sessions } from "./sessions";
import {
  getActiveSessions,
  getRememberedSessions,
  getSessionsCookieExpiry,
  isSessionActive,
  parseSessionsCookie,
} from "./sessions";

const teamId = "cc26004c-c36f-4d94-8614-d73b7fbd1a01";
const session = {
  name: "Workspace",
  logoUrl: null,
  url: "https://team.example.com",
};

describe("parseSessionsCookie", () => {
  it("keeps valid entries while removing malformed entries and IDs", () => {
    expect(
      parseSessionsCookie(
        JSON.stringify({
          [teamId]: session,
          "not-a-uuid": session,
          "cc26004c-c36f-4d94-8614-d73b7fbd1a02": null,
          "cc26004c-c36f-4d94-8614-d73b7fbd1a03": { name: "Missing URL" },
        })
      )
    ).toEqual({ [teamId]: session });
  });

  it.each(["{bad json", "null", "[]", '"string"'])(
    "handles an invalid cookie: %s",
    (value) => {
      expect(parseSessionsCookie(value)).toEqual({});
    }
  );
});

describe("getActiveSessions", () => {
  it("removes expired and invalid expiry dates but keeps legacy entries", () => {
    const expiresAt = addMonths(new Date(), 1).toISOString();
    const sessions: Sessions = {
      legacy: session,
      active: { ...session, expiresAt },
      expired: { ...session, expiresAt: subDays(new Date(), 1).toISOString() },
      invalid: { ...session, expiresAt: "invalid" },
      empty: { ...session, expiresAt: "" },
    };
    expect(getActiveSessions(sessions)).toEqual({
      legacy: session,
      active: { ...session, expiresAt },
    });
  });

  it("keeps expired workspace history in the original sessions", () => {
    const expired = {
      ...session,
      expiresAt: subDays(new Date(), 1).toISOString(),
    };
    const sessions = { expired };
    expect(getActiveSessions(sessions)).toEqual({});
    expect(sessions.expired).toEqual(expired);
    expect(isSessionActive(expired)).toBe(false);
  });
});

describe("workspace retention", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes a workspace after three months of inactivity even when another workspace is used", () => {
    const sessions = {
      recent: {
        ...session,
        expiresAt: subDays(new Date(), 1).toISOString(),
        lastUsedAt: "2026-10-01T12:00:00.000Z",
      },
      boundary: { ...session, lastUsedAt: "2026-07-31T12:00:00.000Z" },
      old: { ...session, lastUsedAt: "2026-07-01T12:00:00.000Z" },
      invalid: { ...session, lastUsedAt: "invalid" },
    };
    expect(getRememberedSessions(sessions)).toEqual({
      recent: sessions.recent,
    });
    expect(getSessionsCookieExpiry(sessions)).toEqual(
      new Date("2027-01-01T12:00:00.000Z")
    );
  });

  it("starts tracking legacy workspaces without extending retention on later reads", () => {
    const sessions = getRememberedSessions({ legacy: session });
    expect(sessions.legacy.lastUsedAt).toEqual(new Date().toISOString());
    vi.setSystemTime(new Date("2026-12-01T12:00:00.000Z"));
    expect(getRememberedSessions(sessions)).toEqual(sessions);
    expect(getSessionsCookieExpiry(sessions)).toEqual(
      new Date("2027-01-31T12:00:00.000Z")
    );
  });

  it("retains workspace history for three months even when every session has expired", () => {
    expect(
      getSessionsCookieExpiry({
        expired: {
          ...session,
          expiresAt: subDays(new Date(), 1).toISOString(),
        },
      })
    ).toEqual(addMonths(new Date(), 3));
  });

  it("expires the cookie when every workspace has been unused for three months", () => {
    expect(
      getSessionsCookieExpiry({
        old: { ...session, lastUsedAt: "2026-07-01T12:00:00.000Z" },
      })
    ).toBeUndefined();
  });

  it("returns no expiry for an empty cookie", () => {
    expect(getSessionsCookieExpiry({})).toBeUndefined();
  });
});
