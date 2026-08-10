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

type Entry = {
  id: string;
  action: string;
  actor: string;
  role: string;
  at: string;
  summary: string;
};

describe("the audit log", () => {
  beforeEach(async () => {
    await post("auth.delete");
    await post("auth.signIn", {
      email: "sinta@acmepets.id",
      password: "longenough12",
    });
  });

  it("records a change, naming who made it", async () => {
    await post("products.save", {
      name: "Audited Product",
      sku: `AUD-${Math.random()}`,
      price: 1000,
    });

    const entries = await post<Entry[]>("audit.list");

    expect(entries[0].action).toBe("products.save");
    expect(entries[0].actor).toBe("sinta@acmepets.id");
    expect(entries[0].role).toBe("owner");
  });

  it("records nothing for merely looking", async () => {
    const before = await post<Entry[]>("audit.list");

    await post("products.list");
    await post("orders.list");
    await post("dashboard");

    const after = await post<Entry[]>("audit.list");
    expect(after).toHaveLength(before.length);
  });

  it("records nothing when a change was refused", async () => {
    const before = await post<Entry[]>("audit.list");

    // No name, so nothing is saved.
    const result = await post<{ saved: boolean }>("products.save", {
      sku: "REFUSED-1",
    });
    expect(result.saved).toBe(false);

    const after = await post<Entry[]>("audit.list");
    expect(after).toHaveLength(before.length);
  });

  it("puts the newest change first", async () => {
    await post("products.save", {
      name: "First",
      sku: `A-${Math.random()}`,
      price: 1,
    });
    await post("products.save", {
      name: "Second",
      sku: `B-${Math.random()}`,
      price: 1,
    });

    const entries = await post<Entry[]>("audit.list");

    expect(new Date(entries[0].at).getTime()).toBeGreaterThanOrEqual(
      new Date(entries[1].at).getTime()
    );
  });

  it("says what the change was about", async () => {
    await post("products.save", {
      name: "Named In Summary",
      sku: `C-${Math.random()}`,
      price: 1,
    });

    const entries = await post<Entry[]>("audit.list");

    expect(entries[0].summary).toContain("Named In Summary");
  });

  it("records a change made by nobody as such", async () => {
    await post("auth.delete");

    await post("products.save", {
      name: "Anonymous Change",
      sku: `D-${Math.random()}`,
      price: 1,
    });

    const entries = await post<Entry[]>("audit.list");
    expect(entries[0].actor).toBe("unknown");
  });

  it("does not record signing in and out as changes", async () => {
    const before = await post<Entry[]>("audit.list");

    await post("auth.delete");
    await post("auth.signIn", {
      email: "sinta@acmepets.id",
      password: "longenough12",
    });

    const after = await post<Entry[]>("audit.list");
    expect(after).toHaveLength(before.length);
  });

  it("keeps the log from growing without limit", async () => {
    for (let index = 0; index < 60; index += 1) {
      await post("products.save", {
        name: `Bulk ${index}`,
        sku: `BULK-${index}-${Math.random()}`,
        price: 1,
      });
    }

    const entries = await post<Entry[]>("audit.list");
    expect(entries.length).toBeLessThanOrEqual(200);
  });
});
