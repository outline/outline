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

type Row = {
  id: string;
  name: string;
  rate: number;
  base: number;
  amount: number;
};

/** Signs in as someone and returns their staff record. */
async function signInAs(email: string) {
  await post("auth.delete");
  await post("auth.signIn", { email, password: "longenough12" });
  const staff = await post<{ id: string; email: string }[]>("staff.list");
  return staff.find((member) => member.email === email);
}

/** Rings up a sale for whoever is signed in. */
async function ringUp(amount: number) {
  const products = await post<{ id: string; name: string }[]>("products.list");
  await post("orders.create", {
    customerName: "Commission Test",
    items: [
      {
        productId: products[0].id,
        name: products[0].name,
        quantity: 1,
        price: amount,
      },
    ],
  });
}

describe("commission", () => {
  beforeEach(async () => {
    await post("auth.delete");
  });

  it("records who rang up a sale", async () => {
    const member = await signInAs("sinta@acmepets.id");
    await ringUp(100000);

    const orders = await post<{ soldById: string | null }[]>("orders.list");
    expect(orders[0].soldById).toBe(member?.id);
  });

  it("is worked out on what that person actually sold", async () => {
    const member = await signInAs("bayu@acmepets.id");
    const before = await post<Row[]>("accounting.commissions");
    const baseBefore = before.find((row) => row.id === member?.id)?.base ?? 0;

    await ringUp(200000);

    const after = await post<Row[]>("accounting.commissions");
    const row = after.find((item) => item.id === member?.id);
    expect(row?.base).toBe(baseBefore + 200000);
  });

  it("pays the rate on that person's own record", async () => {
    const member = await signInAs("bayu@acmepets.id");
    await ringUp(100000);

    const rows = await post<Row[]>("accounting.commissions");
    const row = rows.find((item) => item.id === member?.id);

    expect(row?.amount).toBe(Math.round((row?.base ?? 0) * (row?.rate ?? 0) / 100));
  });

  it("gives nothing to someone who has sold nothing", async () => {
    const staff = await post<{ id: string; commissionRate: number }[]>(
      "staff.list"
    );
    const orders = await post<{ soldById: string | null }[]>("orders.list");
    const sold = new Set(orders.map((order) => order.soldById));
    const idle = staff.find(
      (member) => member.commissionRate > 0 && !sold.has(member.id)
    );

    const rows = await post<Row[]>("accounting.commissions");
    const row = rows.find((item) => item.id === idle?.id);

    expect(row?.base).toBe(0);
    expect(row?.amount).toBe(0);
  });

  it("does not count a sale that was voided", async () => {
    const member = await signInAs("bayu@acmepets.id");
    await ringUp(500000);
    const orders = await post<{ id: string; total: number }[]>("orders.list");
    const before = await post<Row[]>("accounting.commissions");
    const baseBefore = before.find((row) => row.id === member?.id)?.base ?? 0;

    await post("orders.void", { id: orders[0].id });

    const after = await post<Row[]>("accounting.commissions");
    expect(after.find((row) => row.id === member?.id)?.base).toBe(
      baseBefore - 500000
    );
  });

  it("takes returned goods off the base", async () => {
    const member = await signInAs("bayu@acmepets.id");
    const products = await post<{ id: string; name: string }[]>(
      "products.list"
    );
    await post("orders.create", {
      customerName: "Returner",
      items: [
        {
          productId: products[0].id,
          name: products[0].name,
          quantity: 4,
          price: 25000,
        },
      ],
    });
    const orders = await post<{ id: string }[]>("orders.list");
    const before = await post<Row[]>("accounting.commissions");
    const baseBefore = before.find((row) => row.id === member?.id)?.base ?? 0;

    await post("returns.create", {
      orderId: orders[0].id,
      items: [{ productId: products[0].id, quantity: 2, isDamaged: false }],
    });

    const after = await post<Row[]>("accounting.commissions");
    expect(after.find((row) => row.id === member?.id)?.base).toBe(
      baseBefore - 50000
    );
  });

  it("leaves a sale nobody was signed in for unattributed", async () => {
    await post("auth.delete");
    await ringUp(90000);

    const orders = await post<{ soldById: string | null }[]>("orders.list");
    expect(orders[0].soldById).toBeNull();
  });
});

describe("who a sale is credited to", () => {
  it("credits the till sale the shop opens with", async () => {
    // Commission is worked out from `soldById`. The books shipped with no
    // seller against any sale, so Commissions read zero for everyone on a
    // fresh install and the feature looked broken. A sale rung up with
    // nobody signed in is still allowed to have no seller – that is a real
    // situation – so this pins the demo data rather than the rule.
    const orders = await post<
      { number: string; soldById: string | null; total: number }[]
    >("orders.list");
    const seeded = orders.find((order) => order.number === "INV-2041");

    expect(seeded?.soldById).toBeTruthy();
  });

  it("shows commission owed against that sale", async () => {
    const orders = await post<
      { number: string; soldById: string | null; total: number }[]
    >("orders.list");
    const seeded = orders.find((order) => order.number === "INV-2041");
    const rows = await post<{ id: string; base: number; amount: number }[]>(
      "accounting.commissions"
    );
    const seller = rows.find((row) => row.id === seeded?.soldById);

    expect(seller?.base).toBeGreaterThanOrEqual(seeded?.total ?? 0);
    expect(seller?.amount).toBeGreaterThan(0);
  });
});
