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

type Variant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  reorderLevel: number;
  status: string;
  variants?: Variant[];
};

/** A product sold in two sizes. */
async function aVariantProduct(suffix = String(Math.random())) {
  const result = await post<{ saved: boolean; product: Product }>(
    "products.save",
    {
      name: "Royal Canin Adult",
      sku: `FD-ROY-${suffix}`,
      price: 0,
      variants: [
        { name: "2kg", sku: `FD-ROY-2-${suffix}`, price: 285000, stock: 10 },
        { name: "4kg", sku: `FD-ROY-4-${suffix}`, price: 520000, stock: 4 },
      ],
    }
  );
  return result.product;
}

describe("product variants", () => {
  it("keeps each size with its own code, price and stock", async () => {
    const product = await aVariantProduct();

    expect(product.variants).toHaveLength(2);
    expect(product.variants?.[0].price).toBe(285000);
    expect(product.variants?.[1].stock).toBe(4);
  });

  it("gives every variant an id of its own", async () => {
    const product = await aVariantProduct();
    const ids = product.variants?.map((variant) => variant.id) ?? [];

    expect(ids.filter(Boolean)).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("counts the parent's stock as the sum of its variants", async () => {
    const product = await aVariantProduct();

    expect(product.stock).toBe(14);
  });

  it("refuses a variant code another product already uses", async () => {
    const existing = await post<Product[]>("products.list");
    const result = await post<{ saved: boolean; reason?: string }>(
      "products.save",
      {
        name: "Impostor",
        sku: `IMP-${Math.random()}`,
        price: 1000,
        variants: [{ name: "One", sku: existing[0].sku, price: 1, stock: 1 }],
      }
    );

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("duplicate_sku");
  });

  it("refuses two variants sharing a code with each other", async () => {
    const result = await post<{ saved: boolean; reason?: string }>(
      "products.save",
      {
        name: "Clashing",
        sku: `CLASH-${Math.random()}`,
        price: 1000,
        variants: [
          { name: "A", sku: "SAME-CODE", price: 1, stock: 1 },
          { name: "B", sku: "SAME-CODE", price: 2, stock: 1 },
        ],
      }
    );

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("duplicate_sku");
  });

  it("takes a sale off the variant that was sold", async () => {
    const product = await aVariantProduct();
    const variant = product.variants?.[0];

    await post("orders.create", {
      customerName: "Variant Buyer",
      items: [
        {
          productId: product.id,
          variantId: variant?.id,
          name: `${product.name} ${variant?.name}`,
          quantity: 3,
          price: variant?.price,
        },
      ],
    });

    const after = await post<Product[]>("products.list");
    const saved = after.find((item) => item.id === product.id);
    expect(saved?.variants?.[0].stock).toBe(7);
    expect(saved?.variants?.[1].stock).toBe(4);
    expect(saved?.stock).toBe(11);
  });

  it("raises a variant that has run down, naming the size", async () => {
    // insights.list only answers someone signed in, and only for pages their
    // role can open.
    await post("auth.signIn", {
      email: "sinta@acmepets.id",
      password: "longenough12",
    });

    const product = await post<{ product: Product }>("products.save", {
      name: "Nearly Gone",
      sku: `NG-${Math.random()}`,
      price: 0,
      reorderLevel: 5,
      variants: [
        { name: "Small", sku: `NG-S-${Math.random()}`, price: 1000, stock: 1 },
        { name: "Large", sku: `NG-L-${Math.random()}`, price: 2000, stock: 99 },
      ],
    });

    const insights = await post<
      { relatedId: string | null; description: string }[]
    >("insights.list");
    const raised = insights.filter(
      (item) => item.relatedId === product.product.id
    );

    expect(raised).toHaveLength(1);
    expect(raised[0].description).toContain("Small");
  });

  it("puts a returned size back on the shelf it came from", async () => {
    const product = await aVariantProduct();
    const variant = product.variants?.[0];

    await post("orders.create", {
      customerName: "Return A Size",
      items: [
        {
          productId: product.id,
          variantId: variant?.id,
          name: `${product.name} ${variant?.name}`,
          quantity: 4,
          price: variant?.price,
        },
      ],
    });
    const orders = await post<{ id: string }[]>("orders.list");

    await post("returns.create", {
      orderId: orders[0].id,
      items: [
        {
          productId: product.id,
          variantId: variant?.id,
          quantity: 2,
          isDamaged: false,
        },
      ],
    });

    const after = await post<Product[]>("products.list");
    const saved = after.find((item) => item.id === product.id);
    // Sold 4 of the first size and had 2 back: 10 - 4 + 2.
    expect(saved?.variants?.[0].stock).toBe(8);
    expect(saved?.variants?.[1].stock).toBe(4);
    expect(saved?.stock).toBe(12);
  });

  it("puts a voided sale back on the size it was sold from", async () => {
    const product = await aVariantProduct();
    const variant = product.variants?.[1];

    await post("orders.create", {
      customerName: "Void A Size",
      items: [
        {
          productId: product.id,
          variantId: variant?.id,
          name: `${product.name} ${variant?.name}`,
          quantity: 3,
          price: variant?.price,
        },
      ],
    });
    const orders = await post<{ id: string }[]>("orders.list");

    await post("orders.void", { id: orders[0].id });

    const after = await post<Product[]>("products.list");
    const saved = after.find((item) => item.id === product.id);
    expect(saved?.variants?.[0].stock).toBe(10);
    expect(saved?.variants?.[1].stock).toBe(4);
    expect(saved?.stock).toBe(14);
  });

  it("books a delivery in against the size that was ordered", async () => {
    const product = await aVariantProduct();
    const variant = product.variants?.[1];
    const suppliers = await post<{ id: string }[]>("suppliers.list");

    const created = await post<{ created: boolean; order: { id: string } }>(
      "purchaseOrders.create",
      {
        supplierId: suppliers[0].id,
        items: [
          {
            productId: product.id,
            variantId: variant?.id,
            name: `${product.name} ${variant?.name}`,
            quantity: 6,
            cost: 400000,
          },
        ],
      }
    );
    await post("purchaseOrders.receive", { id: created.order.id });

    const after = await post<Product[]>("products.list");
    const saved = after.find((item) => item.id === product.id);
    expect(saved?.variants?.[0].stock).toBe(10);
    expect(saved?.variants?.[1].stock).toBe(10);
    expect(saved?.stock).toBe(20);
  });

  it("leaves a product with no variants working as before", async () => {
    const result = await post<{ saved: boolean; product: Product }>(
      "products.save",
      { name: "Plain", sku: `PLAIN-${Math.random()}`, price: 5000, stock: 7 }
    );

    expect(result.product.variants).toBeUndefined();
    expect(result.product.stock).toBe(7);
  });
});
