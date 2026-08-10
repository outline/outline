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

type Step = {
  id: string;
  title: string;
  done: boolean;
  path: string;
};

describe("the onboarding checklist", () => {
  it("works out each step from the records rather than a stored flag", async () => {
    // A stored "done" can drift from the truth; a step is done when the thing
    // it asks for actually exists.
    const steps = await post<Step[]>("onboarding.steps");
    const products = await post<{ id: string }[]>("products.list");

    const productStep = steps.find((step) => step.id === "products");
    expect(productStep?.done).toBe(products.length > 0);
  });

  it("points every step at somewhere to go and do it", async () => {
    const steps = await post<Step[]>("onboarding.steps");

    expect(steps.length).toBeGreaterThan(0);
    steps.forEach((step) => {
      expect(step.path.startsWith("/")).toBe(true);
      expect(step.title.length).toBeGreaterThan(0);
    });
  });

  it("marks a step done once the thing is there", async () => {
    const before = await post<Step[]>("onboarding.steps");
    const customerStep = before.find((step) => step.id === "customers");
    expect(customerStep?.done).toBe(true);

    // With no customers at all it would be undone; add one and it stays done.
    await post("customers.save", { name: "Onboarding Check" });

    const after = await post<Step[]>("onboarding.steps");
    expect(after.find((step) => step.id === "customers")?.done).toBe(true);
  });

  it("counts how far along the shop is", async () => {
    const progress = await post<{ done: number; total: number }>(
      "onboarding.progress"
    );
    const steps = await post<Step[]>("onboarding.steps");

    expect(progress.total).toBe(steps.length);
    expect(progress.done).toBe(steps.filter((step) => step.done).length);
  });

  it("notices a shop that has taken its first sale", async () => {
    const products = await post<{ id: string; name: string }[]>(
      "products.list"
    );
    await post("orders.create", {
      customerName: "First Sale",
      items: [
        {
          productId: products[0].id,
          name: products[0].name,
          quantity: 1,
          price: 1000,
        },
      ],
    });

    const steps = await post<Step[]>("onboarding.steps");
    expect(steps.find((step) => step.id === "sale")?.done).toBe(true);
  });
});
