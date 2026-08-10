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

type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
  items: { productId: string; name: string; quantity: number; price: number }[];
};

/** A freshly rung-up sale of three units. */
async function aSale(quantity = 3) {
  const products = await post<{ id: string; name: string; price: number }[]>(
    "products.list"
  );
  const product = products.find((item) => item.name !== undefined);
  await post("orders.create", {
    customerName: "Void Test",
    items: [
      {
        productId: product?.id,
        name: product?.name,
        quantity,
        price: 10000,
      },
    ],
  });
  const orders = await post<Order[]>("orders.list");
  return { order: orders[0], productId: product?.id as string };
}

describe("voiding an order", () => {
  it("puts the stock back on the shelf", async () => {
    const { order, productId } = await aSale();
    const before = await post<{ id: string; stock: number }[]>("products.list");
    const stockBefore =
      before.find((item) => item.id === productId)?.stock ?? 0;

    const result = await post<{ voided: boolean }>("orders.void", {
      id: order.id,
    });

    expect(result.voided).toBe(true);
    const after = await post<{ id: string; stock: number }[]>("products.list");
    expect(after.find((item) => item.id === productId)?.stock).toBe(
      stockBefore + 3
    );
  });

  it("marks the order as void rather than deleting it", async () => {
    const { order } = await aSale();

    await post("orders.void", { id: order.id });

    const orders = await post<Order[]>("orders.list");
    const found = orders.find((item) => item.id === order.id);
    expect(found).toBeDefined();
    expect(found?.status).toBe("void");
  });

  it("reverses the sale in the books", async () => {
    const { order } = await aSale();

    await post("orders.void", { id: order.id });

    const journal = await post<
      {
        memo: string;
        lines: { accountId: string; debit: number; credit: number }[];
      }[]
    >("journal.list");
    const entry = journal.find((item) => item.memo.includes("Voided sale"));

    expect(entry).toBeDefined();
    expect(
      entry?.lines.find((line) => line.accountId === "acc-sales")?.debit
    ).toBe(order.total);
    journal.forEach((item) => {
      const delta = item.lines.reduce(
        (sum, line) => sum + line.debit - line.credit,
        0
      );
      expect(delta).toBe(0);
    });
  });

  it("takes it out of the day's takings", async () => {
    const { order } = await aSale();
    const before = await post<{ revenue: number }[]>("dashboard.trend", {
      days: 1,
    });

    await post("orders.void", { id: order.id });

    const after = await post<{ revenue: number }[]>("dashboard.trend", {
      days: 1,
    });
    expect(after[0].revenue).toBe(before[0].revenue - order.total);
  });

  it("takes it out of what has sold", async () => {
    const { order } = await aSale();
    const name = order.items[0].name;
    const before = await post<{ name: string; units: number }[]>(
      "dashboard.topSellers"
    );
    const unitsBefore =
      before.find((item) => item.name === name)?.units ?? 0;

    await post("orders.void", { id: order.id });

    const after = await post<{ name: string; units: number }[]>(
      "dashboard.topSellers"
    );
    const unitsAfter = after.find((item) => item.name === name)?.units ?? 0;
    expect(unitsAfter).toBe(unitsBefore - 3);
  });

  it("will not void an order twice", async () => {
    const { order } = await aSale();
    await post("orders.void", { id: order.id });

    const again = await post<{ voided: boolean; reason?: string }>(
      "orders.void",
      { id: order.id }
    );

    expect(again.voided).toBe(false);
    expect(again.reason).toBe("not_paid");
  });

  it("will not void an order something has been returned against", async () => {
    const { order, productId } = await aSale();
    await post("returns.create", {
      orderId: order.id,
      items: [{ productId, quantity: 1, isDamaged: false }],
    });

    const result = await post<{ voided: boolean; reason?: string }>(
      "orders.void",
      { id: order.id }
    );

    expect(result.voided).toBe(false);
    expect(result.reason).toBe("has_returns");
  });

  it("will not refund goods against an order that was voided", async () => {
    const { order, productId } = await aSale();
    await post("orders.void", { id: order.id });

    const result = await post<{ created: boolean; reason?: string }>(
      "returns.create",
      {
        orderId: order.id,
        items: [{ productId, quantity: 1, isDamaged: false }],
      }
    );

    expect(result.created).toBe(false);
    expect(result.reason).toBe("not_paid");
  });
});
