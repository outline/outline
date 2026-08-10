import { beforeEach, describe, expect, it } from "vitest";
import { handleShopRequest, setCurrentBranch } from "./shop";

/** Posts to a mock endpoint the way the app's client does. */
async function post<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await handleShopRequest(path, body);
  return response?.data as T;
}

type Row = {
  groomerId: string;
  groomerName: string;
  branch: string;
  days: {
    date: string;
    isClosed: boolean;
    appointments: {
      id: string;
      petName: string;
      service: string;
      status: string;
    }[];
  }[];
};

/** A date `days` from now, as `yyyy-mm-dd`. */
const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

describe("the grooming calendar", () => {
  beforeEach(() => {
    setCurrentBranch(undefined);
  });

  it("gives a row per groomer and a column per day", async () => {
    const grid = await post<Row[]>("grooming.calendar", { days: 7 });
    const staff = await post<{ role: string }[]>("staff.list");
    const groomers = staff.filter((member) => member.role === "groomer");

    expect(grid).toHaveLength(groomers.length);
    grid.forEach((row) => {
      expect(row.days).toHaveLength(7);
    });
  });

  it("puts an appointment on the day it is booked for", async () => {
    const grid = await post<Row[]>("grooming.calendar", { days: 3 });
    const appointments = await post<
      { groomerId: string; scheduledAt: string; petName: string }[]
    >("grooming.list");
    const today = appointments.find(
      (item) =>
        new Date(item.scheduledAt).toDateString() === new Date().toDateString()
    );

    if (today) {
      const row = grid.find((item) => item.groomerId === today.groomerId);
      expect(
        row?.days[0].appointments.some(
          (item) => item.petName === today.petName
        )
      ).toBe(true);
    }
    expect(grid.length).toBeGreaterThan(0);
  });

  it("leaves out an appointment that was cancelled", async () => {
    const appointments = await post<{ id: string; groomerId: string }[]>(
      "grooming.list"
    );
    const first = appointments[0];
    await post("grooming.setStatus", { id: first.id, status: "cancelled" });

    const grid = await post<Row[]>("grooming.calendar", { days: 14 });
    const row = grid.find((item) => item.groomerId === first.groomerId);

    expect(
      row?.days.some((day) =>
        day.appointments.some((item) => item.id === first.id)
      )
    ).toBe(false);
  });

  it("marks a day the branch is shut", async () => {
    const grid = await post<Row[]>("grooming.calendar", { days: 2 });
    const branch = grid[0]?.branch;
    const closed = dayFromNow(240);
    await post("branches.addHoliday", { branch, date: closed });

    const after = await post<Row[]>("grooming.calendar", {
      days: 2,
      from: closed,
    });
    const row = after.find((item) => item.branch === branch);

    expect(row?.days[0].isClosed).toBe(true);
    expect(row?.days[1].isClosed).toBe(false);
  });

  it("narrows to the branch being looked at", async () => {
    const staff = await post<{ role: string; branch: string }[]>("staff.list");
    const groomers = staff.filter((member) => member.role === "groomer");
    const branch = groomers[0].branch;

    setCurrentBranch(branch);
    const grid = await post<Row[]>("grooming.calendar", { days: 3 });

    expect(grid.every((row) => row.branch === branch)).toBe(true);
  });
});
