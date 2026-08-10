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

type Subscription = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
  secret: string | null;
};

type Delivery = {
  id: string;
  event: string;
  status: "delivered" | "failed";
  statusCode: number;
};

describe("webhook subscriptions", () => {
  it("answers the endpoints Outline's own settings page calls", async () => {
    // The existing plugin drives a standard store, so these four have to exist
    // under exactly these names.
    expect(await post("webhookSubscriptions.list")).toBeDefined();

    const created = await post<Subscription>("webhookSubscriptions.create", {
      name: "Ops channel",
      url: "https://example.com/hook",
      events: ["documents.publish"],
    });
    expect(created.id).toBeDefined();

    const updated = await post<Subscription>("webhookSubscriptions.update", {
      id: created.id,
      name: "Renamed",
      url: created.url,
      events: created.events,
    });
    expect(updated.name).toBe("Renamed");

    await post("webhookSubscriptions.delete", { id: created.id });
    const list = await post<Subscription[]>("webhookSubscriptions.list");
    expect(list.some((item) => item.id === created.id)).toBe(false);
  });

  it("starts a new subscription switched on", async () => {
    const created = await post<Subscription>("webhookSubscriptions.create", {
      name: "Enabled by default",
      url: "https://example.com/a",
      events: ["documents.publish"],
    });

    expect(created.enabled).toBe(true);
  });

  it("refuses an address that is not a web address", async () => {
    const before = await post<Subscription[]>("webhookSubscriptions.list");

    await post("webhookSubscriptions.create", {
      name: "Bad url",
      url: "not-a-url",
      events: ["documents.publish"],
    });

    const after = await post<Subscription[]>("webhookSubscriptions.list");
    expect(after).toHaveLength(before.length);
    expect(after.some((item) => item.name === "Bad url")).toBe(false);
  });

  it("refuses a subscription listening for nothing", async () => {
    const before = await post<Subscription[]>("webhookSubscriptions.list");

    await post("webhookSubscriptions.create", {
      name: "No events",
      url: "https://example.com/b",
      events: [],
    });

    const after = await post<Subscription[]>("webhookSubscriptions.list");
    expect(after).toHaveLength(before.length);
  });
});

describe("webhook delivery", () => {
  it("delivers to every subscription listening for the event", async () => {
    const a = await post<Subscription>("webhookSubscriptions.create", {
      name: "Listens",
      url: "https://example.com/listens",
      events: ["orders.create"],
    });
    await post<Subscription>("webhookSubscriptions.create", {
      name: "Does not listen",
      url: "https://example.com/quiet",
      events: ["boardings.create"],
    });

    const products =
      await post<{ id: string; name: string; price: number }[]>(
        "products.list"
      );
    await post("orders.create", {
      customerName: "Hook Test",
      items: [
        {
          productId: products[0].id,
          name: products[0].name,
          quantity: 1,
          price: products[0].price,
        },
      ],
    });

    const deliveries = await post<(Delivery & { subscriptionId: string })[]>(
      "webhookDeliveries.list"
    );
    const forThisEvent = deliveries.filter(
      (item) => item.event === "orders.create"
    );

    expect(forThisEvent.some((item) => item.subscriptionId === a.id)).toBe(
      true
    );
    expect(forThisEvent).toHaveLength(1);
  });

  it("delivers everything to a subscription registered for *", async () => {
    // Outline's own settings page offers "all events" as the wildcard "*".
    const all = await post<Subscription>("webhookSubscriptions.create", {
      name: "Everything",
      url: "https://example.com/all",
      events: ["*"],
    });

    await post("customers.save", { name: "Wildcard Trigger" });

    const deliveries = await post<{ subscriptionId: string; event: string }[]>(
      "webhookDeliveries.list"
    );
    expect(
      deliveries.some(
        (item) =>
          item.subscriptionId === all.id && item.event === "customers.save"
      )
    ).toBe(true);
  });

  it("does not deliver to a subscription that is switched off", async () => {
    const off = await post<Subscription>("webhookSubscriptions.create", {
      name: "Switched off",
      url: "https://example.com/off",
      events: ["customers.save"],
    });
    await post("webhookSubscriptions.update", {
      id: off.id,
      name: off.name,
      url: off.url,
      events: off.events,
      enabled: false,
    });

    await post("customers.save", { name: "Quiet Customer" });

    const deliveries = await post<{ subscriptionId: string }[]>(
      "webhookDeliveries.list"
    );
    expect(deliveries.some((item) => item.subscriptionId === off.id)).toBe(
      false
    );
  });

  it("records nothing when a change was refused", async () => {
    await post<Subscription>("webhookSubscriptions.create", {
      name: "Watches saves",
      url: "https://example.com/saves",
      events: ["products.save"],
    });
    const before = await post<Delivery[]>("webhookDeliveries.list");

    await post("products.save", { sku: "NO-NAME" });

    const after = await post<Delivery[]>("webhookDeliveries.list");
    expect(after).toHaveLength(before.length);
  });
});
