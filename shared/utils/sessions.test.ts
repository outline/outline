import { addMonths, subDays } from "date-fns";
import type { Sessions } from "./sessions";
import {
  getActiveSessions,
  getSessionsCookieExpiry,
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

  it("assigns an expiry to legacy entries without extending dated entries", () => {
    const expiresAt = addMonths(new Date(), 1).toISOString();
    const legacyExpiry = addMonths(new Date(), 3);
    expect(
      getActiveSessions(
        { legacy: session, active: { ...session, expiresAt } },
        legacyExpiry
      )
    ).toEqual({
      legacy: { ...session, expiresAt: legacyExpiry.toISOString() },
      active: { ...session, expiresAt },
    });
  });
});

describe("getSessionsCookieExpiry", () => {
  it("uses the latest entry expiry", () => {
    const latest = addMonths(new Date(), 3);
    expect(
      getSessionsCookieExpiry({
        later: { ...session, expiresAt: latest.toISOString() },
        earlier: {
          ...session,
          expiresAt: addMonths(new Date(), 1).toISOString(),
        },
      })
    ).toEqual(latest);
  });

  it("returns no expiry for an empty cookie", () => {
    expect(getSessionsCookieExpiry({})).toBeUndefined();
  });
});
