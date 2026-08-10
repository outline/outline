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

type Day = { date: string; revenue: number; orders: number };
type Seller = { name: string; units: number; revenue: number };

describe("the revenue trend", () => {
  it("gives a point for every day asked for", async () => {
    const days = await post<Day[]>("dashboard.trend", { days: 14 });

    expect(days).toHaveLength(14);
  });

  it("keeps the days in order, oldest first", async () => {
    const days = await post<Day[]>("dashboard.trend", { days: 7 });
    const times = days.map((day) => new Date(day.date).getTime());

    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("ends on today", async () => {
    const days = await post<Day[]>("dashboard.trend", { days: 7 });
    const last = days[days.length - 1];

    expect(new Date(last.date).toDateString()).toBe(new Date().toDateString());
  });

  it("shows a quiet day as nothing rather than leaving it out", async () => {
    // A chart that skips empty days draws a busier shop than there was.
    const days = await post<Day[]>("dashboard.trend", { days: 30 });

    expect(days.every((day) => typeof day.revenue === "number")).toBe(true);
    expect(days.some((day) => day.revenue === 0)).toBe(true);
  });

  it("counts a sale on the day it was paid", async () => {
    const products = await post<{ id: string; name: string; price: number }[]>(
      "products.list"
    );
    const before = await post<Day[]>("dashboard.trend", { days: 7 });
    const beforeToday = before[before.length - 1].revenue;

    await post("orders.create", {
      customerName: "Trend Buyer",
      items: [
        {
          productId: products[0].id,
          name: products[0].name,
          quantity: 2,
          price: 50000,
        },
      ],
    });

    const after = await post<Day[]>("dashboard.trend", { days: 7 });
    expect(after[after.length - 1].revenue).toBe(beforeToday + 100000);
    expect(after[after.length - 1].orders).toBe(
      before[before.length - 1].orders + 1
    );
  });

  it("leaves an unpaid order out of the takings", async () => {
    const orders = await post<{ id: string; status: string; total: number }[]>(
      "orders.list"
    );
    const unpaid = orders.filter((order) => order.status !== "paid");
    const days = await post<Day[]>("dashboard.trend", { days: 365 });
    const total = days.reduce((sum, day) => sum + day.revenue, 0);
    const paidTotal = orders
      .filter((order) => order.status === "paid")
      .reduce((sum, order) => sum + order.total, 0);

    expect(unpaid.length).toBeGreaterThan(0);
    expect(total).toBe(paidTotal);
  });
});

describe("top sellers", () => {
  it("adds up what each line sold across orders", async () => {
    const products = await post<{ id: string; name: string }[]>(
      "products.list"
    );
    const product = products[0];

    await post("orders.create", {
      customerName: "A",
      items: [
        { productId: product.id, name: product.name, quantity: 2, price: 1000 },
      ],
    });
    await post("orders.create", {
      customerName: "B",
      items: [
        { productId: product.id, name: product.name, quantity: 3, price: 1000 },
      ],
    });

    const sellers = await post<Seller[]>("dashboard.topSellers");
    const row = sellers.find((item) => item.name === product.name);

    expect(row?.units).toBeGreaterThanOrEqual(5);
  });

  it("puts the best seller first", async () => {
    const sellers = await post<Seller[]>("dashboard.topSellers");
    const units = sellers.map((item) => item.units);

    expect(units).toEqual([...units].sort((a, b) => b - a));
  });

  it("counts each size under its own name", async () => {
    const saved = await post<{ product: { id: string; variants: { id: string; name: string }[] } }>(
      "products.save",
      {
        name: "Sized Thing",
        sku: `SZ-${Math.random()}`,
        price: 0,
        variants: [
          { name: "Small", sku: `SZ-S-${Math.random()}`, price: 1000, stock: 50 },
          { name: "Large", sku: `SZ-L-${Math.random()}`, price: 2000, stock: 50 },
        ],
      }
    );
    const large = saved.product.variants[1];

    await post("orders.create", {
      customerName: "Sizes",
      items: [
        {
          productId: saved.product.id,
          variantId: large.id,
          name: "Sized Thing Large",
          quantity: 4,
          price: 2000,
        },
      ],
    });

    const sellers = await post<Seller[]>("dashboard.topSellers");
    expect(sellers.some((item) => item.name === "Sized Thing Large")).toBe(
      true
    );
    expect(sellers.some((item) => item.name === "Sized Thing Small")).toBe(
      false
    );
  });

  it("takes returned goods back off the count", async () => {
    const products = await post<{ id: string; name: string }[]>(
      "products.list"
    );
    const product = products[0];
    await post("orders.create", {
      customerName: "Returner",
      items: [
        { productId: product.id, name: product.name, quantity: 5, price: 1000 },
      ],
    });
    const orders = await post<{ id: string; customerName: string }[]>(
      "orders.list"
    );
    const order = orders.find((item) => item.customerName === "Returner");

    const before = await post<Seller[]>("dashboard.topSellers");
    const unitsBefore =
      before.find((item) => item.name === product.name)?.units ?? 0;

    await post("returns.create", {
      orderId: order?.id,
      items: [{ productId: product.id, quantity: 2, isDamaged: false }],
    });

    const after = await post<Seller[]>("dashboard.topSellers");
    const unitsAfter =
      after.find((item) => item.name === product.name)?.units ?? 0;

    expect(unitsAfter).toBe(unitsBefore - 2);
  });
});
