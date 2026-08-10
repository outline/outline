import { describe, expect, it } from "vitest";
import { handleShopRequest } from "./shop";

/** Posts to a mock endpoint the way the app's client does. */
async function post<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await handleShopRequest(path, body);
  return response?.data as T;
}

type Holiday = { id: string; branch: string; date: string; reason: string };

/** A date `days` from now, as `yyyy-mm-dd`. */
const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

describe("branch holidays", () => {
  it("records a day the branch is closed", async () => {
    const result = await post<{ saved: boolean; holiday: Holiday }>(
      "branches.addHoliday",
      { branch: "Kemang", date: dayFromNow(40), reason: "Idul Fitri" }
    );

    expect(result.saved).toBe(true);
    const holidays = await post<Holiday[]>("branches.holidays");
    expect(holidays.some((item) => item.id === result.holiday.id)).toBe(true);
  });

  it("refuses a day with no branch or no date", async () => {
    const result = await post<{ saved: boolean; reason?: string }>(
      "branches.addHoliday",
      { branch: "Kemang" }
    );

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("missing_details");
  });

  it("refuses the same day twice at one branch", async () => {
    const date = dayFromNow(41);
    await post("branches.addHoliday", { branch: "Kemang", date });

    const again = await post<{ saved: boolean; reason?: string }>(
      "branches.addHoliday",
      { branch: "Kemang", date }
    );

    expect(again.saved).toBe(false);
    expect(again.reason).toBe("duplicate");
  });

  it("lets a different branch close on the same day", async () => {
    const date = dayFromNow(42);
    await post("branches.addHoliday", { branch: "Kemang", date });

    const other = await post<{ saved: boolean }>("branches.addHoliday", {
      branch: "Bintaro",
      date,
    });

    expect(other.saved).toBe(true);
  });

  it("removes a day again", async () => {
    const created = await post<{ holiday: Holiday }>("branches.addHoliday", {
      branch: "Kemang",
      date: dayFromNow(43),
    });

    await post("branches.removeHoliday", { id: created.holiday.id });

    const holidays = await post<Holiday[]>("branches.holidays");
    expect(holidays.some((item) => item.id === created.holiday.id)).toBe(false);
  });

  it("will not close a day guests are already booked in for", async () => {
    const rooms = await post<{ id: string; branch: string }[]>("rooms.list");
    const room = rooms[0];
    const checkIn = dayFromNow(50);
    const checkOut = dayFromNow(52);
    await post("boardings.create", {
      customerName: "Already Booked",
      petName: "Rex",
      roomId: room.id,
      checkIn,
      checkOut,
    });

    const result = await post<{ saved: boolean; reason?: string }>(
      "branches.addHoliday",
      { branch: room.branch, date: dayFromNow(51) }
    );

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("has_guests");
  });
});

describe("booking around a holiday", () => {
  it("refuses a stay that covers a day the branch is shut", async () => {
    const rooms = await post<{ id: string; branch: string }[]>("rooms.list");
    const room = rooms[0];
    await post("branches.addHoliday", {
      branch: room.branch,
      date: dayFromNow(61),
    });

    const result = await post<{ created: boolean; reason?: string }>(
      "boardings.create",
      {
        customerName: "Holiday Clash",
        petName: "Bo",
        roomId: room.id,
        checkIn: dayFromNow(60),
        checkOut: dayFromNow(62),
      }
    );

    expect(result.created).toBe(false);
    expect(result.reason).toBe("closed");
  });

  it("allows a stay that misses the closure", async () => {
    const rooms = await post<{ id: string; branch: string }[]>("rooms.list");
    const room = rooms[0];
    await post("branches.addHoliday", {
      branch: room.branch,
      date: dayFromNow(71),
    });

    const result = await post<{ created: boolean }>("boardings.create", {
      customerName: "Clear Run",
      petName: "Ziggy",
      roomId: room.id,
      checkIn: dayFromNow(73),
      checkOut: dayFromNow(75),
    });

    expect(result.created).toBe(true);
  });

  it("turns a visitor away from the shopfront too", async () => {
    const rooms = await post<{ id: string; branch: string; type: string }[]>(
      "rooms.list"
    );
    const branches = [...new Set(rooms.map((room) => room.branch))];
    // Far enough out that no guest is booked, since a day with guests cannot
    // be closed at all.
    const checkIn = dayFromNow(120);
    const checkOut = dayFromNow(122);
    for (const branch of branches) {
      for (let day = 120; day <= 122; day += 1) {
        await post("branches.addHoliday", {
          branch,
          date: dayFromNow(day),
          reason: "Closed",
        });
      }
    }

    const result = await post<{ created: boolean; reason?: string }>(
      "public.booking.create",
      {
        customerName: "Visitor",
        petName: "Pip",
        roomType: "standard",
        checkIn,
        checkOut,
      }
    );

    expect(result.created).toBe(false);
    expect(result.reason).toBe("no_room");
  });

  it("still lets a visitor book when the shop is open", async () => {
    const result = await post<{ created: boolean }>("public.booking.create", {
      customerName: "Welcome",
      petName: "Nix",
      roomType: "standard",
      checkIn: dayFromNow(140),
      checkOut: dayFromNow(142),
    });

    expect(result.created).toBe(true);
  });
});
