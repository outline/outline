import { describe, expect, it, vi } from "vitest";
import type { Advance, Invoice } from "./shop";
import {
  handleShopRequest,
  priceAdvance,
  priceInvoice,
  roomOccupancy,
} from "./shop";

/** The parts of a purchase order these tests assert on. */
interface PurchaseOrderShape {
  id: string;
  status: string;
  items: { received: number; quantity: number }[];
}

/** Builds an invoice with only the fields the pricing cares about. */
function anInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-test",
    number: "INV-9000",
    customerId: "cus-1",
    customerName: "Test Customer",
    issueDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    items: [{ name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    taxRate: 0.11,
    notes: "",
    payments: [],
    isVoid: false,
    ...overrides,
  };
}

/** Builds an advance with only the fields the balance cares about. */
function anAdvance(overrides: Partial<Advance> = {}): Advance {
  return {
    id: "adv-test",
    staffId: "stf-1",
    staffName: "Test Staff",
    amount: 1000000,
    installment: 200000,
    notes: "",
    createdAt: new Date().toISOString(),
    payments: [],
    ...overrides,
  };
}

/**
 * Posts to a mock endpoint the way the app's client does.
 *
 * The dispatch returns one untyped envelope for every route, so the shape is
 * named here by the caller. The single assertion lives in this helper rather
 * than at each call site.
 *
 * @param path the endpoint name.
 * @param body the request body.
 * @returns the response payload.
 */
async function post<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await handleShopRequest(path, body);
  return response?.data as T;
}

describe("priceInvoice", () => {
  it("adds tax to the discounted subtotal", () => {
    const priced = priceInvoice(
      anInvoice({
        items: [
          { name: "Boarding", quantity: 5, unitPrice: 150000, discount: 0 },
          { name: "Groom", quantity: 1, unitPrice: 250000, discount: 50000 },
        ],
      })
    );

    expect(priced.subtotal).toBe(950000);
    expect(priced.tax).toBe(104500);
    expect(priced.total).toBe(1054500);
  });

  it("reads as unpaid when nothing has been paid", () => {
    expect(priceInvoice(anInvoice()).status).toBe("unpaid");
  });

  it("reads as partial once some of it is paid", () => {
    const priced = priceInvoice(
      anInvoice({
        payments: [
          {
            id: "p1",
            date: "",
            amount: 50000,
            method: "cash",
            reference: "",
          },
        ],
      })
    );

    expect(priced.status).toBe("partial");
    expect(priced.due).toBe(61000);
  });

  it("reads as paid once the payments settle the total exactly", () => {
    const priced = priceInvoice(
      anInvoice({
        payments: [
          { id: "p1", date: "", amount: 50000, method: "cash", reference: "" },
          { id: "p2", date: "", amount: 61000, method: "bank", reference: "" },
        ],
      })
    );

    expect(priced.status).toBe("paid");
    expect(priced.due).toBe(0);
  });

  it("stays void even when it has been settled", () => {
    const priced = priceInvoice(
      anInvoice({
        isVoid: true,
        payments: [
          {
            id: "p1",
            date: "",
            amount: 111000,
            method: "cash",
            reference: "",
          },
        ],
      })
    );

    expect(priced.status).toBe("void");
  });

  it("does not go negative when a discount cancels the line", () => {
    const priced = priceInvoice(
      anInvoice({
        items: [
          { name: "Item", quantity: 1, unitPrice: 100000, discount: 100000 },
        ],
      })
    );

    expect(priced.subtotal).toBe(0);
    expect(priced.tax).toBe(0);
    expect(priced.due).toBe(0);
  });

  it("rounds tax to whole rupiah", () => {
    const priced = priceInvoice(
      anInvoice({
        items: [{ name: "Item", quantity: 1, unitPrice: 333333, discount: 0 }],
      })
    );

    expect(priced.tax).toBe(36667);
  });

  it("is overdue only while something is still owed", () => {
    const past = new Date(Date.now() - 86400000).toISOString();

    expect(priceInvoice(anInvoice({ dueDate: past })).isOverdue).toBe(true);
    expect(
      priceInvoice(
        anInvoice({
          dueDate: past,
          payments: [
            {
              id: "p1",
              date: "",
              amount: 111000,
              method: "cash",
              reference: "",
            },
          ],
        })
      ).isOverdue
    ).toBe(false);
  });
});

describe("priceAdvance", () => {
  it("subtracts the repayments from the amount lent", () => {
    const priced = priceAdvance(
      anAdvance({
        payments: [
          { id: "a1", date: "", amount: 300000, source: "manual" },
          { id: "a2", date: "", amount: 300000, source: "commission" },
        ],
      })
    );

    expect(priced.repaid).toBe(600000);
    expect(priced.remaining).toBe(400000);
    expect(priced.status).toBe("active");
  });

  it("is paid off once the repayments cover it", () => {
    const priced = priceAdvance(
      anAdvance({
        payments: [{ id: "a1", date: "", amount: 1000000, source: "manual" }],
      })
    );

    expect(priced.remaining).toBe(0);
    expect(priced.status).toBe("paid_off");
  });
});

describe("invoice handlers", () => {
  it("refuses a payment larger than the balance", async () => {
    const created = await post<{ invoice: { id: string } }>("invoices.create", {
      customerName: "Overpay Test",
      items: [{ name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    });
    const id = created.invoice.id;

    const result = await post<{ recorded: boolean; reason?: string }>(
      "invoices.recordPayment",
      {
        id,
        amount: 999999999,
      }
    );

    expect(result.recorded).toBe(false);
    expect(result.reason).toBe("overpay");

    const after = await post<{ payments: unknown[] }>("invoices.info", { id });
    expect(after.payments).toHaveLength(0);
  });

  it("refuses a payment of nothing", async () => {
    const created = await post<{ invoice: { id: string } }>("invoices.create", {
      customerName: "Zero Test",
      items: [{ name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    });

    const result = await post<{ recorded: boolean; reason?: string }>(
      "invoices.recordPayment",
      {
        id: created.invoice.id,
        amount: 0,
      }
    );

    expect(result.recorded).toBe(false);
  });

  it("will not void an invoice that has been paid against", async () => {
    const created = await post<{ invoice: { id: string } }>("invoices.create", {
      customerName: "Void Test",
      items: [{ name: "Item", quantity: 1, unitPrice: 100000, discount: 0 }],
    });
    const id = created.invoice.id;
    await post("invoices.recordPayment", { id, amount: 1000 });

    const result = await post<{ voided: boolean; reason?: string }>(
      "invoices.void",
      { id }
    );

    expect(result.voided).toBe(false);
    expect(result.reason).toBe("has_payments");
  });

  it("posts a balanced entry for every invoice event", async () => {
    const created = await post<{ invoice: { id: string } }>("invoices.create", {
      customerName: "Ledger Test",
      items: [{ name: "Item", quantity: 2, unitPrice: 50000, discount: 0 }],
    });
    await post("invoices.recordPayment", {
      id: created.invoice.id,
      amount: 1000,
    });

    const journal =
      await post<{ lines: { debit: number; credit: number }[] }[]>(
        "journal.list"
      );
    journal.forEach((entry) => {
      const delta = entry.lines.reduce(
        (sum, line) => sum + line.debit - line.credit,
        0
      );
      expect(delta).toBe(0);
    });
  });
});

describe("purchase order receiving", () => {
  it("books in only what is outstanding, however much is claimed", async () => {
    const suppliers = await post<{ id: string }[]>("suppliers.list");
    const products =
      await post<{ id: string; name: string; stock: number; status: string }[]>(
        "products.list"
      );
    const created = await post<{ order: { id: string } }>(
      "purchaseOrders.create",
      {
        supplierId: suppliers[0].id,
        items: [
          {
            productId: products[0].id,
            name: products[0].name,
            quantity: 10,
            cost: 1000,
          },
        ],
      }
    );
    const id = created.order.id;

    await post("purchaseOrders.receive", {
      id,
      quantities: { [products[0].id]: 4 },
    });
    const partial = (
      await post<PurchaseOrderShape[]>("purchaseOrders.list")
    ).find((order) => order.id === id);
    expect(partial?.items[0].received).toBe(4);
    expect(partial?.status).toBe("partial");

    // Ask for far more than the six still outstanding.
    await post("purchaseOrders.receive", {
      id,
      quantities: { [products[0].id]: 500 },
    });
    const complete = (
      await post<PurchaseOrderShape[]>("purchaseOrders.list")
    ).find((order) => order.id === id);
    expect(complete?.items[0].received).toBe(10);
    expect(complete?.status).toBe("received");
  });

  it("refuses to receive an order that is already closed", async () => {
    const suppliers = await post<{ id: string }[]>("suppliers.list");
    const products =
      await post<{ id: string; name: string; stock: number; status: string }[]>(
        "products.list"
      );
    const created = await post<{ order: { id: string } }>(
      "purchaseOrders.create",
      {
        supplierId: suppliers[0].id,
        items: [
          {
            productId: products[0].id,
            name: products[0].name,
            quantity: 1,
            cost: 1000,
          },
        ],
      }
    );

    await post("purchaseOrders.receive", { id: created.order.id });
    const again = await post<{ received: boolean; reason?: string }>(
      "purchaseOrders.receive",
      { id: created.order.id }
    );

    expect(again.received).toBe(false);
    expect(again.reason).toBe("closed");
  });
});

describe("advance handlers", () => {
  it("refuses a repayment larger than the balance", async () => {
    const staff = await post<{ id: string }[]>("staff.list");
    const created = await post<{ advance: { id: string } }>("advances.create", {
      staffId: staff[0].id,
      amount: 500000,
    });

    const result = await post<{ repaid: boolean; reason?: string }>(
      "advances.repay",
      {
        id: created.advance.id,
        amount: 500001,
      }
    );

    expect(result.repaid).toBe(false);
    expect(result.reason).toBe("overpay");
  });
});

describe("room availability", () => {
  it("counts a room as free once the stay it holds has ended", () => {
    const nextMonth = Date.now() + 30 * 86400000;
    const soon = roomOccupancy();
    const later = roomOccupancy(nextMonth, nextMonth + 2 * 86400000);

    const occupiedNow = soon.filter((room) => room.occupied > 0);
    const occupiedLater = later.filter((room) => room.occupied > 0);

    expect(occupiedNow.length).toBeGreaterThan(0);
    expect(occupiedLater.length).toBeLessThan(occupiedNow.length);
  });
});

describe("portal settings", () => {
  it("refuses a web address that could not be reached", async () => {
    const result = await post<{ saved: boolean; reason?: string }>(
      "portal.settings.update",
      { slug: "Acme Pets!!" }
    );

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("bad_slug");
  });

  it("keeps fields that were not sent", async () => {
    const before = await post<{ slug: string }>("portal.stats");
    await post("portal.settings.update", { tagline: "Changed tagline" });
    const after = await post<{ slug: string }>("portal.stats");

    expect(after.slug).toBe(before.slug);
  });

  it("closes the public shopfront when the portal is switched off", async () => {
    const stats = await post<{ slug: string }>("portal.stats");

    await post("portal.settings.update", { portalEnabled: false });
    expect(await post("public.business", { slug: stats.slug })).toBeNull();

    await post("portal.settings.update", { portalEnabled: true });
    expect(await post("public.business", { slug: stats.slug })).not.toBeNull();
  });
});

describe("public product", () => {
  it("does not resolve a product that is out of stock", async () => {
    const products =
      await post<{ id: string; name: string; stock: number; status: string }[]>(
        "products.list"
      );
    const stats = await post<{ slug: string }>("portal.stats");
    const product = products.find(
      (item) => item.stock > 0 && item.status === "active"
    );
    if (!product) {
      throw new Error("the seed must publish at least one sellable product");
    }

    expect(
      await post("public.product", { slug: stats.slug, id: product.id })
    ).not.toBeNull();

    await post("products.adjustStock", {
      id: product.id,
      delta: -product.stock,
    });

    expect(
      await post("public.product", { slug: stats.slug, id: product.id })
    ).toBeNull();
  });

  it("does not resolve for another tenant's address", async () => {
    const products =
      await post<{ id: string; name: string; stock: number; status: string }[]>(
        "products.list"
      );

    expect(
      await post("public.product", {
        slug: "someone-else",
        id: products[0].id,
      })
    ).toBeNull();
  });
});

describe("seed consistency", () => {
  it("gives every order a total that matches its lines", async () => {
    // A stored total can drift from the lines under it, and the detail page
    // prints both — INV-2041 shipped claiming 353.000 over lines worth
    // 330.000.
    const orders = await post<
      {
        number: string;
        total: number;
        items: { price: number; quantity: number }[];
      }[]
    >("orders.list");

    expect(orders.length).toBeGreaterThan(0);
    orders.forEach((order) => {
      const lines = order.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      expect({ number: order.number, total: order.total }).toEqual({
        number: order.number,
        total: lines,
      });
    });
  });

  it("gives every purchase order lines it can be received against", async () => {
    const purchaseOrders = await post<PurchaseOrderShape[]>(
      "purchaseOrders.list"
    );

    purchaseOrders.forEach((order) => {
      expect(order.items.length).toBeGreaterThan(0);
      order.items.forEach((item) => {
        expect(item.received).toBeLessThanOrEqual(item.quantity);
      });
    });
  });

  it("keeps every loyalty balance equal to its ledger", async () => {
    const customers =
      await post<{ id: string; loyaltyPoints: number }[]>("customers.list");
    const ledger =
      await post<{ customerId: string; points: number }[]>("loyalty.list");

    customers.forEach((customer) => {
      const earned = ledger
        .filter((entry) => entry.customerId === customer.id)
        .reduce((sum, entry) => sum + entry.points, 0);
      expect(customer.loyaltyPoints).toBe(earned);
    });
  });
});

describe("endpoint names", () => {
  it("does not answer to any of Outline's own endpoints", async () => {
    // handleShopRequest is consulted before the wiki handlers, so a shop
    // endpoint sharing a name silently shadows the real one. `documents.list`
    // did exactly that until it was renamed.
    const wikiEndpoints = [
      "documents.list",
      "documents.info",
      "documents.create",
      "documents.update",
      "documents.delete",
      "documents.search",
      "documents.star",
      "documents.unstar",
      "collections.list",
      "collections.info",
      "comments.list",
      "comments.create",
      "pins.list",
      "pins.create",
      "users.list",
      "stars.list",
    ];

    for (const endpoint of wikiEndpoints) {
      expect(await handleShopRequest(endpoint, {})).toBeUndefined();
    }
  });
});

describe("loading persisted state", () => {
  it("fills in collections a stale saved blob has never heard of", async () => {
    // What a browser persisted before invoices and templates existed. Handlers
    // spread these, so a missing key used to crash the page that read it.
    localStorage.setItem(
      "shop_db_v5",
      JSON.stringify({ products: [], customers: [] })
    );
    vi.resetModules();
    const stale = await import("./shop");

    // The keys have to exist and carry the seed, not be undefined: the
    // handlers spread them.
    expect(
      Array.isArray((await stale.handleShopRequest("invoices.list", {}))?.data)
    ).toBe(true);
    expect(
      (await stale.handleShopRequest("documentTemplates.list", {}))?.data
    ).toHaveLength(2);
    // What the blob did carry still wins over the seed.
    expect((await stale.handleShopRequest("products.list", {}))?.data).toEqual(
      []
    );
  });

  it("fills in fields a stale saved blob is missing from a nested object", async () => {
    // portalEnabled was added to `business` after the key was in use; a
    // shallow merge would have let the old object mask it.
    localStorage.setItem(
      "shop_db_v5",
      JSON.stringify({ business: { slug: "acme-pets", name: "Acme" } })
    );
    vi.resetModules();
    const stale = await import("./shop");

    const stats = (await stale.handleShopRequest("portal.stats", {}))?.data as {
      enabled: boolean;
    };
    expect(stats.enabled).toBe(true);
  });
});

describe("document templates", () => {
  it("refuses to save a template with no title", async () => {
    const result = await post<{ saved: boolean; reason?: string }>(
      "documentTemplates.save",
      {
        type: "receipt",
        title: "   ",
      }
    );

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("missing_title");
  });

  it("leaves the other template alone", async () => {
    const before = await post<{ type: string }[]>("documentTemplates.list");
    const agreement = before.find(
      (item: { type: string }) => item.type === "agreement"
    );

    await post("documentTemplates.save", { type: "receipt", title: "Changed" });

    const after = await post<{ type: string }[]>("documentTemplates.list");
    expect(
      after.find((item: { type: string }) => item.type === "agreement")
    ).toEqual(agreement);
  });
});
