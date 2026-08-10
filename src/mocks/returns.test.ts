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

type OrderShape = {
  id: string;
  number: string;
  status: string;
  total: number;
  items: { productId: string; name: string; quantity: number; price: number }[];
};

type Created = {
  created: boolean;
  reason?: string;
  refundable?: number;
  return?: { id: string; refundAmount: number };
};

/** A paid order to return goods from. */
async function aPaidOrder(): Promise<OrderShape> {
  const products =
    await post<{ id: string; name: string; price: number }[]>("products.list");
  const product = products[0];
  await post("orders.create", {
    customerName: "Return Test",
    items: [
      {
        productId: product.id,
        name: product.name,
        quantity: 4,
        price: product.price,
      },
    ],
  });
  const orders = await post<OrderShape[]>("orders.list");
  return orders[0];
}

describe("returns", () => {
  it("refunds what was handed back and puts it on the shelf", async () => {
    const order = await aPaidOrder();
    const line = order.items[0];
    const before = await post<{ id: string; stock: number }[]>("products.list");
    const stockBefore =
      before.find((item) => item.id === line.productId)?.stock ?? 0;

    const result = await post<Created>("returns.create", {
      orderId: order.id,
      reason: "Wrong size",
      refundMethod: "cash",
      items: [{ productId: line.productId, quantity: 2, isDamaged: false }],
    });

    expect(result.created).toBe(true);
    expect(result.return?.refundAmount).toBe(line.price * 2);

    const after = await post<{ id: string; stock: number }[]>("products.list");
    expect(after.find((item) => item.id === line.productId)?.stock).toBe(
      stockBefore + 2
    );
  });

  it("keeps damaged goods off the shelf but still refunds them", async () => {
    const order = await aPaidOrder();
    const line = order.items[0];
    const before = await post<{ id: string; stock: number }[]>("products.list");
    const stockBefore =
      before.find((item) => item.id === line.productId)?.stock ?? 0;

    const result = await post<Created>("returns.create", {
      orderId: order.id,
      reason: "Damaged in transit",
      refundMethod: "cash",
      items: [{ productId: line.productId, quantity: 1, isDamaged: true }],
    });

    expect(result.created).toBe(true);
    expect(result.return?.refundAmount).toBe(line.price);

    const after = await post<{ id: string; stock: number }[]>("products.list");
    expect(after.find((item) => item.id === line.productId)?.stock).toBe(
      stockBefore
    );
  });

  it("refuses more than was bought", async () => {
    const order = await aPaidOrder();
    const line = order.items[0];

    const result = await post<Created>("returns.create", {
      orderId: order.id,
      items: [{ productId: line.productId, quantity: 99, isDamaged: false }],
    });

    expect(result.created).toBe(false);
    expect(result.reason).toBe("too_many");
    expect(result.refundable).toBe(line.quantity);
  });

  it("counts what has already gone back when refusing", async () => {
    const order = await aPaidOrder();
    const line = order.items[0];

    await post("returns.create", {
      orderId: order.id,
      items: [{ productId: line.productId, quantity: 3, isDamaged: false }],
    });
    const second = await post<Created>("returns.create", {
      orderId: order.id,
      items: [{ productId: line.productId, quantity: 2, isDamaged: false }],
    });

    expect(second.created).toBe(false);
    expect(second.refundable).toBe(1);
  });

  it("refuses a return of nothing", async () => {
    const order = await aPaidOrder();

    const result = await post<Created>("returns.create", {
      orderId: order.id,
      items: [],
    });

    expect(result.created).toBe(false);
    expect(result.reason).toBe("nothing_returned");
  });

  it("refuses an order it cannot find", async () => {
    const result = await post<Created>("returns.create", {
      orderId: "ord-nope",
      items: [{ productId: "prd-1", quantity: 1, isDamaged: false }],
    });

    expect(result.created).toBe(false);
    expect(result.reason).toBe("not_found");
  });

  it("refuses to refund an order that was never paid", async () => {
    const orders = await post<OrderShape[]>("orders.list");
    const unpaid = orders.find((order) => order.status !== "paid");

    const result = await post<Created>("returns.create", {
      orderId: unpaid?.id,
      items: [
        {
          productId: unpaid?.items[0].productId,
          quantity: 1,
          isDamaged: false,
        },
      ],
    });

    expect(result.created).toBe(false);
    expect(result.reason).toBe("not_paid");
  });

  it("posts a balanced entry reversing the sale", async () => {
    const order = await aPaidOrder();
    const line = order.items[0];

    await post("returns.create", {
      orderId: order.id,
      refundMethod: "cash",
      items: [{ productId: line.productId, quantity: 1, isDamaged: false }],
    });

    const journal = await post<
      {
        reference: string;
        memo: string;
        lines: { accountId: string; debit: number; credit: number }[];
      }[]
    >("journal.list");
    // The refund reverses the sale: income comes back off, cash goes out.
    const entry = journal.find((item) => /refund/i.test(item.memo));

    expect(entry).toBeDefined();
    expect(
      entry?.lines.find((journalLine) => journalLine.accountId === "acc-sales")
        ?.debit
    ).toBe(line.price);
    expect(
      entry?.lines.find((journalLine) => journalLine.accountId === "acc-cash")
        ?.credit
    ).toBe(line.price);
    journal.forEach((item) => {
      const delta = item.lines.reduce(
        (sum, journalLine) => sum + journalLine.debit - journalLine.credit,
        0
      );
      expect(delta).toBe(0);
    });
  });

  it("lists what has been returned", async () => {
    const order = await aPaidOrder();
    const line = order.items[0];
    await post("returns.create", {
      orderId: order.id,
      reason: "Changed their mind",
      items: [{ productId: line.productId, quantity: 1, isDamaged: false }],
    });

    const returns =
      await post<{ orderNumber: string; reason: string }[]>("returns.list");

    expect(returns.some((item) => item.orderNumber === order.number)).toBe(
      true
    );
  });
});
