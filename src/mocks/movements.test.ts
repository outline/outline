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

type Movement = {
  id: string;
  productId: string;
  type: "in" | "out" | "transfer" | "adjustment";
  quantity: number;
};

describe("the stock movement ledger", () => {
  it("records stock leaving as a reduction", async () => {
    // A ledger only adds up if a direction always carries the same sign.
    // Selling two of something has to read as -2 whether it was seeded or
    // rung up at the till, or the running total is nonsense.
    const movements = await post<Movement[]>("movements.list");
    const out = movements.filter((movement) => movement.type === "out");

    expect(out.length).toBeGreaterThan(0);
    out.forEach((movement) => {
      expect(movement.quantity).toBeLessThan(0);
    });
  });

  it("records stock arriving as an increase", async () => {
    const movements = await post<Movement[]>("movements.list");
    const incoming = movements.filter((movement) => movement.type === "in");

    expect(incoming.length).toBeGreaterThan(0);
    incoming.forEach((movement) => {
      expect(movement.quantity).toBeGreaterThan(0);
    });
  });

  it("keeps the sign when a sale writes its own movement", async () => {
    const products = await post<{ id: string; name: string }[]>("products.list");
    const before = await post<Movement[]>("movements.list");

    await post("orders.create", {
      customerName: "Ledger Check",
      channel: "pos",
      items: [{ productId: products[0].id, quantity: 3 }],
    });

    const after = await post<Movement[]>("movements.list");
    const added = after.filter(
      (movement) => !before.some((seen) => seen.id === movement.id)
    );
    const sold = added.find((movement) => movement.productId === products[0].id);

    expect(sold?.type).toBe("out");
    expect(sold?.quantity).toBe(-3);
  });
});
