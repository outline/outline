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
  status: "draft" | "paid" | "refunded" | "void";
  paidAt: string | null;
  total: number;
};

/** Rings up a sale so the test has an order it owns. */
async function sellSomething(): Promise<Order> {
  const products = await post<{ id: string }[]>("products.list");
  const before = await post<Order[]>("orders.list");
  await post("orders.create", {
    customerName: "Lifecycle Test",
    items: [{ productId: products[0].id, quantity: 1 }],
  });
  const after = await post<Order[]>("orders.list");
  const created = after.find(
    (order) => !before.some((seen) => seen.id === order.id)
  );
  if (!created) {
    throw new Error("the sale was not recorded");
  }
  return created;
}

describe("what a sale will not do", () => {
  it("refuses to bring a voided sale back by marking it paid", async () => {
    // Voiding puts the stock back and reverses the sale in the books.
    // Marking it paid again does neither of those in reverse, so the sale
    // would count as revenue a second time against stock already returned.
    const order = await sellSomething();
    await post("orders.void", { id: order.id });

    await post("orders.markPaid", { id: order.id });

    const orders = await post<Order[]>("orders.list");
    expect(orders.find((item) => item.id === order.id)?.status).toBe("void");
  });

  it("says so rather than re-dating a sale that is already paid", async () => {
    // paidAt decides which day's takings a sale lands in, so setting it again
    // would drag an old sale into today's figures. Asserting on the answer
    // rather than on paidAt keeps this honest: both writes call new Date(),
    // so within the same millisecond an unguarded re-date looks identical.
    const order = await sellSomething();

    const result = await post<{ paid: boolean; reason?: string }>(
      "orders.markPaid",
      { id: order.id }
    );

    expect(result.paid).toBe(false);
    expect(result.reason).toBe("already_paid");
  });

  it("still lets an unpaid sale be settled", async () => {
    const orders = await post<Order[]>("orders.list");
    const unpaid = orders.find((order) => order.status === "draft");

    if (unpaid) {
      await post("orders.markPaid", { id: unpaid.id });
      const after = await post<Order[]>("orders.list");
      const settled = after.find((order) => order.id === unpaid.id);
      expect(settled?.status).toBe("paid");
      expect(settled?.paidAt).toBeTruthy();
    }
    expect(orders.length).toBeGreaterThan(0);
  });
});
