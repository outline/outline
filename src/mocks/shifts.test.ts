import { beforeEach, describe, expect, it } from "vitest";
import { handleShopRequest } from "./shop";

/** Posts to a mock endpoint the way the app's client does. */
async function post<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await handleShopRequest(path, body);
  return response?.data as T;
}

type Shift = {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
};

type Result = { ok: boolean; reason?: string; shift?: Shift };

/**
 * A staff member of this test's own, with no shift open.
 *
 * Made fresh each time rather than borrowed from the seed: these tests leave
 * shifts running, and a shared member would soon have one open already.
 */
async function someoneFree(): Promise<{ id: string; name: string }> {
  const suffix = Math.random().toString(36).slice(2, 8);
  const result = await post<{ member: { id: string; name: string } }>(
    "staff.save",
    {
      name: `Shift Tester ${suffix}`,
      email: `shift-${suffix}@acmepets.id`,
      role: "caretaker",
      branch: "Kemang",
    }
  );
  return result.member;
}

describe("clocking in", () => {
  beforeEach(async () => {
    await post("auth.signIn", {
      email: "sinta@acmepets.id",
      password: "longenough12",
    });
  });

  it("opens a shift with the time it started", async () => {
    const member = await someoneFree();

    const result = await post<Result>("shifts.clockIn", { staffId: member.id });

    expect(result.ok).toBe(true);
    expect(result.shift?.clockIn).toMatch(/^\d{2}:\d{2}$/);
    expect(result.shift?.clockOut).toBeNull();
    expect(result.shift?.staffName).toBe(member.name);
  });

  it("will not open a second shift while one is running", async () => {
    const member = await someoneFree();
    await post("shifts.clockIn", { staffId: member.id });

    const again = await post<Result>("shifts.clockIn", { staffId: member.id });

    expect(again.ok).toBe(false);
    expect(again.reason).toBe("already_in");
  });

  it("will not let someone who is not working clock in", async () => {
    const staff = await post<{ id: string }[]>("staff.list");
    const member = staff[0];
    await post("staff.setStatus", { id: member.id, status: "on_leave" });

    const result = await post<Result>("shifts.clockIn", { staffId: member.id });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_working");

    await post("staff.setStatus", { id: member.id, status: "active" });
  });

  it("will not clock in someone who does not work here", async () => {
    const result = await post<Result>("shifts.clockIn", { staffId: "stf-nope" });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_found");
  });
});

describe("clocking out", () => {
  it("closes the open shift with the time it ended", async () => {
    const member = await someoneFree();
    await post("shifts.clockIn", { staffId: member.id });

    const result = await post<Result>("shifts.clockOut", {
      staffId: member.id,
    });

    expect(result.ok).toBe(true);
    expect(result.shift?.clockOut).toMatch(/^\d{2}:\d{2}$/);
  });

  it("will not close a shift that was never opened", async () => {
    const member = await someoneFree();

    const result = await post<Result>("shifts.clockOut", {
      staffId: member.id,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_in");
  });

  it("leaves the shift closed once it is closed", async () => {
    const member = await someoneFree();
    await post("shifts.clockIn", { staffId: member.id });
    await post("shifts.clockOut", { staffId: member.id });

    const again = await post<Result>("shifts.clockOut", {
      staffId: member.id,
    });

    expect(again.ok).toBe(false);
    expect(again.reason).toBe("not_in");
  });

  it("records the change in the audit log", async () => {
    const member = await someoneFree();

    await post("shifts.clockIn", { staffId: member.id });

    const entries = await post<{ action: string }[]>("audit.list");
    expect(entries[0].action).toBe("shifts.clockIn");
  });
});

describe("who is on shift", () => {
  it("says who is clocked in right now", async () => {
    const member = await someoneFree();
    await post("shifts.clockIn", { staffId: member.id });

    const onShift = await post<{ staffId: string; staffName: string }[]>(
      "shifts.onShift"
    );

    expect(onShift.some((entry) => entry.staffId === member.id)).toBe(true);
  });

  it("drops them once they clock out", async () => {
    const member = await someoneFree();
    await post("shifts.clockIn", { staffId: member.id });
    await post("shifts.clockOut", { staffId: member.id });

    const onShift = await post<{ staffId: string }[]>("shifts.onShift");

    expect(onShift.some((entry) => entry.staffId === member.id)).toBe(false);
  });
});
