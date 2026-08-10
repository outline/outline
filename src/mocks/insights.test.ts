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

type Insight = {
  id: string;
  type: "trend" | "anomaly" | "recommendation" | "alert";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  module: string;
  relatedId: string | null;
};

describe("what each role is shown", () => {
  it("does not tell a groomer what a customer owes", async () => {
    // /invoices is a manager's page; its figures should not arrive on the
    // dashboard of someone who cannot open it.
    await post("auth.delete");
    await post("auth.signIn", {
      email: "dimas@acmepets.id",
      password: "longenough12",
    });

    const shown = await post<Insight[]>("insights.list");

    expect(shown.some((item) => item.module === "invoices")).toBe(false);
    expect(shown.some((item) => item.module === "loyalty")).toBe(false);
  });

  it("still tells them about the stock they work with", async () => {
    const shown = await post<Insight[]>("insights.list");

    expect(shown.some((item) => item.module === "inventory")).toBe(true);
  });

  it("tells the owner everything", async () => {
    await post("auth.delete");
    await post("auth.signIn", {
      email: "sinta@acmepets.id",
      password: "longenough12",
    });

    const shown = await post<Insight[]>("insights.list");

    expect(shown.some((item) => item.module === "invoices")).toBe(true);
  });
});

describe("insights", () => {
  it("raises stock that has fallen to its reorder level", async () => {
    const created = await post<{ product: { id: string; name: string } }>(
      "products.save",
      {
        name: "Nearly Out",
        sku: `LOW-${Math.random()}`,
        price: 1000,
        stock: 1,
        reorderLevel: 5,
      }
    );

    const insights = await post<Insight[]>("insights.list");
    const found = insights.find(
      (item) => item.relatedId === created.product.id
    );

    expect(found).toBeDefined();
    expect(found?.module).toBe("inventory");
    expect(found?.description).toContain("Nearly Out");
  });

  it("says nothing about stock that is comfortable", async () => {
    const created = await post<{ product: { id: string } }>("products.save", {
      name: "Plenty",
      sku: `OK-${Math.random()}`,
      price: 1000,
      stock: 500,
      reorderLevel: 5,
    });

    const insights = await post<Insight[]>("insights.list");

    expect(insights.some((item) => item.relatedId === created.product.id)).toBe(
      false
    );
  });

  it("raises an invoice that is past its due date", async () => {
    const created = await post<{ invoice: { id: string; number: string } }>(
      "invoices.create",
      {
        customerName: "Late Payer",
        dueDate: new Date(Date.now() - 10 * 86400000).toISOString(),
        items: [{ name: "Thing", quantity: 1, unitPrice: 50000, discount: 0 }],
      }
    );

    const insights = await post<Insight[]>("insights.list");
    const found = insights.find(
      (item) => item.relatedId === created.invoice.id
    );

    expect(found).toBeDefined();
    expect(found?.severity).toBe("critical");
    expect(found?.module).toBe("invoices");
  });

  it("stops raising an invoice once it has been settled", async () => {
    const created = await post<{
      invoice: { id: string; total: number };
    }>("invoices.create", {
      customerName: "Prompt Payer",
      dueDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      items: [{ name: "Thing", quantity: 1, unitPrice: 50000, discount: 0 }],
    });
    await post("invoices.recordPayment", {
      id: created.invoice.id,
      amount: created.invoice.total,
    });

    const insights = await post<Insight[]>("insights.list");

    expect(insights.some((item) => item.relatedId === created.invoice.id)).toBe(
      false
    );
  });

  it("points every insight at a record that exists", async () => {
    const insights = await post<Insight[]>("insights.list");
    const products = await post<{ id: string }[]>("products.list");
    const invoices = await post<{ id: string }[]>("invoices.list");
    const batches = await post<{ id: string }[]>("batches.list");
    const rooms = await post<{ id: string }[]>("rooms.list");
    const customers = await post<{ id: string }[]>("customers.list");

    const known = new Set(
      [...products, ...invoices, ...batches, ...rooms, ...customers].map(
        (item) => item.id
      )
    );

    insights
      .filter((item) => item.relatedId !== null)
      .forEach((item) => {
        expect(known.has(item.relatedId as string)).toBe(true);
      });
  });

  it("puts the most serious first", async () => {
    const insights = await post<Insight[]>("insights.list");
    const rank = { critical: 0, warning: 1, info: 2 };

    const ranks = insights.map((item) => rank[item.severity]);
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });

  it("gives every insight a reason someone can act on", async () => {
    const insights = await post<Insight[]>("insights.list");

    expect(insights.length).toBeGreaterThan(0);
    insights.forEach((item) => {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(["trend", "anomaly", "recommendation", "alert"]).toContain(
        item.type
      );
    });
  });
});
