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

type Saved = { saved: boolean; reason?: string };
type Removed = { removed: boolean; reason?: string };

describe("record ids", () => {
  it("gives each record its own id however fast they are made", async () => {
    // Date.now() alone repeats inside a millisecond, and two records sharing
    // an id makes every lookup by id ambiguous.
    const created = await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        post<{ product: { id: string } }>("products.save", {
          name: `Rapid ${index}`,
          sku: `RAPID-${index}`,
          price: 1000,
        })
      )
    );

    const ids = created.map((result) => result.product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("products", () => {
  it("adds one to the catalogue", async () => {
    const result = await post<Saved & { product: { id: string; sku: string } }>(
      "products.save",
      {
        name: "Cat Tree Large",
        sku: "AC-TRE-L",
        price: 890000,
        category: "Accessories",
      }
    );

    expect(result.saved).toBe(true);
    const products = await post<{ sku: string }[]>("products.list");
    expect(products.some((item) => item.sku === "AC-TRE-L")).toBe(true);
  });

  it("refuses one with no name", async () => {
    const result = await post<Saved>("products.save", { sku: "X-1", price: 1 });

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("missing_details");
  });

  it("refuses a code another product already uses", async () => {
    const existing = await post<{ sku: string }[]>("products.list");
    const result = await post<Saved>("products.save", {
      name: "Impostor",
      sku: existing[0].sku,
      price: 1000,
    });

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("duplicate_sku");
  });

  it("edits one in place rather than adding another", async () => {
    const before = await post<{ id: string; sku: string }[]>("products.list");
    const target = before[0];

    await post("products.save", {
      id: target.id,
      name: "Renamed Product",
      sku: target.sku,
      price: 12345,
    });

    const after =
      await post<{ id: string; name: string; price: number }[]>(
        "products.list"
      );
    expect(after).toHaveLength(before.length);
    expect(after.find((item) => item.id === target.id)?.name).toBe(
      "Renamed Product"
    );
  });

  it("keeps a product that has been sold, archiving it instead", async () => {
    const orders =
      await post<{ items: { productId: string }[] }[]>("orders.list");
    const soldId = orders[0].items[0].productId;

    const result = await post<Removed>("products.delete", { id: soldId });

    expect(result.removed).toBe(false);
    expect(result.reason).toBe("in_use");
    const products =
      await post<{ id: string; status: string }[]>("products.list");
    expect(products.find((item) => item.id === soldId)?.status).toBe(
      "archived"
    );
  });

  it("removes one nothing refers to", async () => {
    const created = await post<{ product: { id: string } }>("products.save", {
      name: "Never Sold",
      sku: "ZZ-NEV-1",
      price: 1000,
    });

    const result = await post<Removed>("products.delete", {
      id: created.product.id,
    });

    expect(result.removed).toBe(true);
    const products = await post<{ id: string }[]>("products.list");
    expect(products.some((item) => item.id === created.product.id)).toBe(false);
  });
});

describe("customers", () => {
  it("adds one with their pets", async () => {
    const result = await post<Saved & { customer: { id: string } }>(
      "customers.save",
      {
        name: "Dewi Anggraini",
        email: "dewi@example.com",
        phone: "+62 811-0000-1111",
        pets: [{ name: "Kiki", species: "Cat", breed: "Ragdoll" }],
      }
    );

    expect(result.saved).toBe(true);
    const customers =
      await post<{ id: string; pets: { name: string }[] }[]>("customers.list");
    const saved = customers.find((item) => item.id === result.customer.id);
    expect(saved?.pets.map((pet) => pet.name)).toEqual(["Kiki"]);
  });

  it("refuses one with no name", async () => {
    const result = await post<Saved>("customers.save", {
      email: "nameless@example.com",
    });

    expect(result.saved).toBe(false);
  });

  it("gives every pet an id of its own", async () => {
    const result = await post<{ customer: { pets: { id: string }[] } }>(
      "customers.save",
      {
        name: "Two Pets",
        pets: [
          { name: "A", species: "Dog", breed: "Mixed" },
          { name: "B", species: "Cat", breed: "Mixed" },
        ],
      }
    );

    const ids = result.customer.pets.map((pet) => pet.id);
    expect(ids.filter(Boolean)).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("gives a pet a real id even when sent a blank one", async () => {
    // A form that has no id yet sends an empty string, which is not nullish.
    const result = await post<{ customer: { pets: { id: string }[] } }>(
      "customers.save",
      {
        name: "Blank Pet Id",
        pets: [{ id: "", name: "Ghost", species: "Cat", breed: "Mixed" }],
      }
    );

    expect(result.customer.pets[0].id).not.toBe("");
    expect(result.customer.pets[0].id).toMatch(/^pet-/);
  });

  it("keeps a customer who has stayed with us", async () => {
    const boardings = await post<{ customerId: string }[]>("boardings.list");
    const staying = boardings.find((item) => item.customerId !== "public");

    const result = await post<Removed>("customers.delete", {
      id: staying?.customerId,
    });

    expect(result.removed).toBe(false);
    expect(result.reason).toBe("in_use");
  });

  it("removes one with no history", async () => {
    const created = await post<{ customer: { id: string } }>("customers.save", {
      name: "Passing Trade",
    });

    const result = await post<Removed>("customers.delete", {
      id: created.customer.id,
    });

    expect(result.removed).toBe(true);
  });
});

describe("staff", () => {
  it("adds one with an address to sign in with", async () => {
    const result = await post<Saved & { member: { id: string } }>(
      "staff.save",
      {
        name: "Andi Saputra",
        email: "andi@acmepets.id",
        role: "caretaker",
        branch: "Kemang",
        phone: "+62 812-0000-0000",
      }
    );

    expect(result.saved).toBe(true);
    const staff = await post<{ id: string; email: string }[]>("staff.list");
    expect(staff.find((item) => item.id === result.member.id)?.email).toBe(
      "andi@acmepets.id"
    );
  });

  it("refuses an address another member already signs in with", async () => {
    const staff = await post<{ email: string }[]>("staff.list");

    const result = await post<Saved>("staff.save", {
      name: "Impostor",
      email: staff[0].email,
      role: "cashier",
      branch: "Kemang",
    });

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("duplicate_email");
  });

  it("refuses a role that does not exist", async () => {
    const result = await post<Saved>("staff.save", {
      name: "Wrong Role",
      email: "wrong@acmepets.id",
      role: "wizard",
      branch: "Kemang",
    });

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("bad_role");
  });

  it("keeps someone who still owes an advance", async () => {
    const advances =
      await post<{ staffId: string; remaining: number }[]>("advances.list");
    const owing = advances.find((item) => item.remaining > 0);

    const result = await post<Removed>("staff.delete", { id: owing?.staffId });

    expect(result.removed).toBe(false);
    expect(result.reason).toBe("owes_advance");
  });
});

describe("suppliers", () => {
  it("adds one", async () => {
    const result = await post<Saved & { supplier: { id: string } }>(
      "suppliers.save",
      {
        name: "Sahabat Satwa",
        contact: "Rudi",
        phone: "+62 21 555 9000",
        terms: "Net 30",
      }
    );

    expect(result.saved).toBe(true);
  });

  it("keeps one with an order still open", async () => {
    const orders = await post<{ supplierId: string; status: string }[]>(
      "purchaseOrders.list"
    );
    const open = orders.find(
      (item) => item.status !== "received" && item.status !== "cancelled"
    );

    const result = await post<Removed>("suppliers.delete", {
      id: open?.supplierId,
    });

    expect(result.removed).toBe(false);
    expect(result.reason).toBe("in_use");
  });
});

describe("warehouses", () => {
  it("adds one", async () => {
    const result = await post<Saved>("warehouses.save", {
      name: "Gudang Selatan",
      branch: "Kemang",
    });

    expect(result.saved).toBe(true);
  });

  it("keeps one that still holds stock", async () => {
    const batches = await post<{ warehouseId: string }[]>("batches.list");

    const result = await post<Removed>("warehouses.delete", {
      id: batches[0].warehouseId,
    });

    expect(result.removed).toBe(false);
    expect(result.reason).toBe("in_use");
  });
});

describe("branches", () => {
  it("adds one", async () => {
    const result = await post<Saved & { branch: { id: string } }>(
      "branches.save",
      {
        name: "Pondok Indah",
        address: "Jl. Metro Pondok Indah 1",
        phone: "+62 21 555 3000",
        manager: "Bayu Pratama",
      }
    );

    expect(result.saved).toBe(true);
  });

  it("keeps one that still has rooms", async () => {
    const branches =
      await post<{ id: string; name: string }[]>("branches.list");
    const rooms = await post<{ branch: string }[]>("rooms.list");
    const withRooms = branches.find((branch) =>
      rooms.some((room) => room.branch === branch.name)
    );

    const result = await post<Removed>("branches.delete", {
      id: withRooms?.id,
    });

    expect(result.removed).toBe(false);
    expect(result.reason).toBe("in_use");
  });
});
