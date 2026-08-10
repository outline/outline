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

type Cell = {
  roomId: string;
  roomName: string;
  branch: string;
  capacity: number;
  days: {
    date: string;
    occupied: number;
    isFull: boolean;
    isClosed: boolean;
    guests: { boardingId: string; petName: string }[];
  }[];
};

/** A date `days` from now, as `yyyy-mm-dd`. */
const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

describe("the occupancy calendar", () => {
  it("gives a row per room and a column per day", async () => {
    const rooms = await post<{ id: string }[]>("rooms.list");
    const grid = await post<Cell[]>("occupancy.calendar", { days: 10 });

    expect(grid).toHaveLength(rooms.length);
    grid.forEach((row) => {
      expect(row.days).toHaveLength(10);
    });
  });

  it("starts today unless told otherwise", async () => {
    const grid = await post<Cell[]>("occupancy.calendar", { days: 3 });

    expect(new Date(grid[0].days[0].date).toDateString()).toBe(
      new Date().toDateString()
    );
  });

  it("starts where it is told to", async () => {
    const from = dayFromNow(30);
    const grid = await post<Cell[]>("occupancy.calendar", { days: 2, from });

    expect(grid[0].days[0].date.slice(0, 10)).toBe(from);
  });

  it("shows a stay on every day it covers, not just the first", async () => {
    const rooms = await post<{ id: string; branch: string }[]>("rooms.list");
    const room = rooms[rooms.length - 1];
    const created = await post<{
      created: boolean;
      boarding: { id: string };
    }>("boardings.create", {
      customerName: "Long Stay",
      petName: "Comet",
      roomId: room.id,
      checkIn: dayFromNow(300),
      checkOut: dayFromNow(303),
    });
    expect(created.created).toBe(true);

    const grid = await post<Cell[]>("occupancy.calendar", {
      days: 5,
      from: dayFromNow(300),
    });
    const row = grid.find((item) => item.roomId === room.id);
    const covered = row?.days.filter((day) =>
      day.guests.some((guest) => guest.petName === "Comet")
    );

    expect(covered).toHaveLength(4);
  });

  it("leaves out a stay that was cancelled", async () => {
    const rooms = await post<{ id: string }[]>("rooms.list");
    const room = rooms[rooms.length - 1];
    const created = await post<{ boarding: { id: string } }>(
      "boardings.create",
      {
        customerName: "Cancelled",
        petName: "Ghost",
        roomId: room.id,
        checkIn: dayFromNow(320),
        checkOut: dayFromNow(321),
      }
    );
    await post("boardings.updateStatus", {
      id: created.boarding.id,
      status: "cancelled",
    });

    const grid = await post<Cell[]>("occupancy.calendar", {
      days: 3,
      from: dayFromNow(320),
    });
    const row = grid.find((item) => item.roomId === room.id);

    expect(
      row?.days.some((day) =>
        day.guests.some((guest) => guest.petName === "Ghost")
      )
    ).toBe(false);
  });

  it("marks a day the branch is shut", async () => {
    const rooms = await post<{ id: string; branch: string }[]>("rooms.list");
    const room = rooms[0];
    const closed = dayFromNow(340);
    await post("branches.addHoliday", { branch: room.branch, date: closed });

    const grid = await post<Cell[]>("occupancy.calendar", {
      days: 2,
      from: closed,
    });
    const row = grid.find((item) => item.roomId === room.id);

    expect(row?.days[0].isClosed).toBe(true);
    expect(row?.days[1].isClosed).toBe(false);
  });

  it("calls a room full only when it is at capacity", async () => {
    const grid = await post<Cell[]>("occupancy.calendar", { days: 7 });

    grid.forEach((row) => {
      row.days.forEach((day) => {
        expect(day.isFull).toBe(day.occupied >= row.capacity);
      });
    });
  });
});
