import { beforeEach, describe, expect, it } from "vitest";
import { currentBranch, handleShopRequest, setCurrentBranch } from "./shop";

/** Posts to a mock endpoint the way the app's client does. */
async function post<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await handleShopRequest(path, body);
  return response?.data as T;
}

describe("the branch a person is looking at", () => {
  beforeEach(() => {
    setCurrentBranch(undefined);
  });

  it("shows every branch until one is chosen", () => {
    expect(currentBranch()).toBeUndefined();
  });

  it("remembers the branch that was chosen", async () => {
    const branches = await post<{ name: string }[]>("branches.list");

    setCurrentBranch(branches[0].name);

    expect(currentBranch()).toBe(branches[0].name);
  });

  it("goes back to every branch when the choice is cleared", async () => {
    const branches = await post<{ name: string }[]>("branches.list");
    setCurrentBranch(branches[0].name);

    setCurrentBranch(undefined);

    expect(currentBranch()).toBeUndefined();
  });

  it("falls back to every branch when the one chosen has gone", async () => {
    // A branch can be removed while someone still has it selected; showing
    // nothing at all would look like the shop had lost its records.
    setCurrentBranch("Somewhere That Closed");

    expect(currentBranch()).toBeUndefined();
  });
});

describe("what the summaries show", () => {
  beforeEach(() => {
    setCurrentBranch(undefined);
  });

  it("counts only the chosen branch's spaces on the dashboard", async () => {
    const rooms = await post<{ branch: string; capacity: number }[]>(
      "rooms.list"
    );
    const branch = rooms[0].branch;
    const expected = rooms
      .filter((room) => room.branch === branch)
      .reduce((sum, room) => sum + room.capacity, 0);

    setCurrentBranch(branch);
    const dashboard = await post<{ capacity: number }>("dashboard");

    expect(dashboard.capacity).toBe(expected);
  });

  it("counts every branch when none is chosen", async () => {
    const rooms = await post<{ capacity: number }[]>("rooms.list");
    const all = rooms.reduce((sum, room) => sum + room.capacity, 0);

    const dashboard = await post<{ capacity: number }>("dashboard");

    expect(dashboard.capacity).toBe(all);
  });

  it("raises insights only for the branch being looked at", async () => {
    await post("auth.signIn", {
      email: "sinta@acmepets.id",
      password: "longenough12",
    });
    const rooms = await post<{ id: string; branch: string }[]>("rooms.list");
    const elsewhere = rooms.find((room) => room.branch !== rooms[0].branch);

    setCurrentBranch(rooms[0].branch);
    const shown = await post<{ module: string; relatedId: string | null }[]>(
      "insights.list"
    );

    expect(
      shown.some((insight) => insight.relatedId === elsewhere?.id)
    ).toBe(false);
  });

  it("shows commission only for that branch's people", async () => {
    const staff = await post<{ branch: string; commissionRate: number }[]>(
      "staff.list"
    );
    const branch = staff[0].branch;

    setCurrentBranch(branch);
    const rows = await post<{ branch: string }[]>("accounting.commissions");

    expect(rows.every((row) => row.branch === branch)).toBe(true);
  });
});

describe("what the calendar shows", () => {
  beforeEach(() => {
    setCurrentBranch(undefined);
  });

  it("covers every room when no branch is chosen", async () => {
    const rooms = await post<{ id: string }[]>("rooms.list");
    const grid = await post<{ roomId: string }[]>("occupancy.calendar", {
      days: 3,
    });

    expect(grid).toHaveLength(rooms.length);
  });

  it("narrows to the branch that was chosen", async () => {
    const rooms = await post<{ branch: string }[]>("rooms.list");
    const branch = rooms[0].branch;
    const expected = rooms.filter((room) => room.branch === branch).length;

    setCurrentBranch(branch);
    const grid = await post<{ branch: string }[]>("occupancy.calendar", {
      days: 3,
    });

    expect(grid).toHaveLength(expected);
    expect(grid.every((row) => row.branch === branch)).toBe(true);
  });

  it("does not narrow what other branches can still be booked", async () => {
    // Choosing a branch changes what you are looking at, not what the shop
    // will accept – a booking for another branch must still go through.
    const rooms = await post<{ id: string; branch: string }[]>("rooms.list");
    const elsewhere = rooms.find((room) => room.branch !== rooms[0].branch);
    setCurrentBranch(rooms[0].branch);

    const result = await post<{ created: boolean }>("boardings.create", {
      customerName: "Other Branch",
      petName: "Rue",
      roomId: elsewhere?.id,
      checkIn: new Date(Date.now() + 400 * 86400000)
        .toISOString()
        .slice(0, 10),
      checkOut: new Date(Date.now() + 402 * 86400000)
        .toISOString()
        .slice(0, 10),
    });

    expect(result.created).toBe(true);
  });
});
