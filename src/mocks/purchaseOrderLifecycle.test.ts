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

type PurchaseOrder = {
  id: string;
  status: "draft" | "ordered" | "partial" | "received" | "cancelled";
  items: { productId: string; quantity: number; received: number }[];
};

/** The order as it now stands. */
async function reread(id: string): Promise<PurchaseOrder | undefined> {
  const all = await post<PurchaseOrder[]>("purchaseOrders.list");
  return all.find((order) => order.id === id);
}

/** Raises a purchase order for a single line. */
async function raiseOrder(quantity: number): Promise<PurchaseOrder> {
  const products = await post<{ id: string; name: string }[]>("products.list");
  const suppliers = await post<{ id: string }[]>("suppliers.list");
  const before = await post<PurchaseOrder[]>("purchaseOrders.list");
  await post("purchaseOrders.create", {
    supplierId: suppliers[0].id,
    items: [
      {
        productId: products[0].id,
        productName: products[0].name,
        quantity,
        unitCost: 1000,
      },
    ],
  });
  const after = await post<PurchaseOrder[]>("purchaseOrders.list");
  const raised = after.find(
    (order) => !before.some((seen) => seen.id === order.id)
  );
  if (!raised) {
    throw new Error("the purchase order was not raised");
  }
  return raised;
}

// Nothing was wrong here before the machine — these pin the behaviour that
// was already right, so that moving the rules into the machine cannot
// quietly change them.
describe("what a purchase order will not do", () => {
  it("closes once everything has arrived", async () => {
    const order = await raiseOrder(4);
    const line = order.items[0];

    await post("purchaseOrders.receive", {
      id: order.id,
      quantities: { [line.productId]: 4 },
    });

    expect((await reread(order.id))?.status).toBe("received");
  });

  it("stays open while part of it is still outstanding", async () => {
    const order = await raiseOrder(4);
    const line = order.items[0];

    await post("purchaseOrders.receive", {
      id: order.id,
      quantities: { [line.productId]: 1 },
    });

    expect((await reread(order.id))?.status).toBe("partial");
  });

  it("refuses a delivery against an order that is already closed", async () => {
    const order = await raiseOrder(2);
    const line = order.items[0];
    await post("purchaseOrders.receive", {
      id: order.id,
      quantities: { [line.productId]: 2 },
    });

    const again = await post<{ received: boolean; reason?: string }>(
      "purchaseOrders.receive",
      { id: order.id, quantities: { [line.productId]: 1 } }
    );

    expect(again.received).toBe(false);
    expect(again.reason).toBe("closed");
  });

  it("never books in more than was ordered", async () => {
    const order = await raiseOrder(3);
    const line = order.items[0];

    await post("purchaseOrders.receive", {
      id: order.id,
      quantities: { [line.productId]: 99 },
    });

    const after = await reread(order.id);
    expect(after?.items[0].received).toBe(3);
    expect(after?.status).toBe("received");
  });
});
