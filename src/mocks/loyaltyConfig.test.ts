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

type Config = {
  /** Rupiah spent to earn one point. */
  rupiahPerPoint: number;
  tiers: { name: string; from: number }[];
};

describe("the loyalty settings", () => {
  it("says what a point costs to earn", async () => {
    const config = await post<Config>("loyalty.config");

    expect(config.rupiahPerPoint).toBeGreaterThan(0);
  });

  it("lists the tiers from the highest down", async () => {
    const config = await post<Config>("loyalty.config");
    const thresholds = config.tiers.map((tier) => tier.from);

    expect(thresholds).toEqual([...thresholds].sort((a, b) => b - a));
  });

  it("starts the lowest tier at nothing, so everyone has one", async () => {
    const config = await post<Config>("loyalty.config");

    expect(config.tiers[config.tiers.length - 1].from).toBe(0);
  });

  it("saves a changed rate", async () => {
    await post("loyalty.saveConfig", { rupiahPerPoint: 5000 });

    const config = await post<Config>("loyalty.config");
    expect(config.rupiahPerPoint).toBe(5000);

    await post("loyalty.saveConfig", { rupiahPerPoint: 1000 });
  });

  it("refuses a rate of nothing, which would mint points forever", async () => {
    const before = await post<Config>("loyalty.config");

    const result = await post<{ saved: boolean; reason?: string }>(
      "loyalty.saveConfig",
      { rupiahPerPoint: 0 }
    );

    expect(result.saved).toBe(false);
    const after = await post<Config>("loyalty.config");
    expect(after.rupiahPerPoint).toBe(before.rupiahPerPoint);
  });

  it("refuses tiers that are not in order", async () => {
    const result = await post<{ saved: boolean; reason?: string }>(
      "loyalty.saveConfig",
      {
        tiers: [
          { name: "Low", from: 100 },
          { name: "High", from: 900 },
        ],
      }
    );

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("bad_tiers");
  });

  it("earns points on a groom at the rate that is set", async () => {
    await post("loyalty.saveConfig", { rupiahPerPoint: 2000 });

    const appointments = await post<
      { id: string; status: string; price: number; customerId: string }[]
    >("grooming.list");
    const booked = appointments.find((item) => item.status !== "done");
    const customers = await post<{ id: string; loyaltyPoints: number }[]>(
      "customers.list"
    );
    const before =
      customers.find((item) => item.id === booked?.customerId)
        ?.loyaltyPoints ?? 0;

    await post("grooming.setStatus", { id: booked?.id, status: "done" });

    const after = await post<{ id: string; loyaltyPoints: number }[]>(
      "customers.list"
    );
    const earned =
      (after.find((item) => item.id === booked?.customerId)?.loyaltyPoints ??
        0) - before;

    expect(earned).toBe(Math.round((booked?.price ?? 0) / 2000));

    await post("loyalty.saveConfig", { rupiahPerPoint: 1000 });
  });
});
