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

type Flow = {
  accountId: string;
  name: string;
  opening: number;
  received: number;
  paid: number;
  closing: number;
};

describe("the cash flow", () => {
  it("covers every account money actually sits in", async () => {
    const flows = await post<Flow[]>("accounting.cashFlow");
    const ids = flows.map((flow) => flow.accountId);

    expect(ids).toContain("acc-cash");
    expect(ids).toContain("acc-bank");
    expect(ids).toContain("acc-petty");
  });

  it("leaves out accounts that are not money", async () => {
    const flows = await post<Flow[]>("accounting.cashFlow");
    const ids = flows.map((flow) => flow.accountId);

    expect(ids).not.toContain("acc-sales");
    expect(ids).not.toContain("acc-stock");
    expect(ids).not.toContain("acc-ap");
  });

  it("closes on what it opened with plus what moved", async () => {
    // The one thing a cash flow has to do is add up.
    const flows = await post<Flow[]>("accounting.cashFlow");

    flows.forEach((flow) => {
      expect(flow.closing).toBe(flow.opening + flow.received - flow.paid);
    });
  });

  it("agrees with the trial balance on what is in the till", async () => {
    const flows = await post<Flow[]>("accounting.cashFlow");
    const trial = await post<{ id: string; balance: number }[]>(
      "accounting.trialBalance"
    );

    flows.forEach((flow) => {
      const row = trial.find((item) => item.id === flow.accountId);
      if (row) {
        expect(flow.closing).toBe(row.balance);
      }
    });
  });

  it("counts a cash sale as money received", async () => {
    const products = await post<{ id: string; name: string }[]>(
      "products.list"
    );
    const before = await post<Flow[]>("accounting.cashFlow");
    const cashBefore = before.find((flow) => flow.accountId === "acc-cash");

    await post("orders.create", {
      customerName: "Cash Buyer",
      items: [
        {
          productId: products[0].id,
          name: products[0].name,
          quantity: 1,
          price: 75000,
        },
      ],
    });

    const after = await post<Flow[]>("accounting.cashFlow");
    const cashAfter = after.find((flow) => flow.accountId === "acc-cash");

    expect(cashAfter?.received).toBe((cashBefore?.received ?? 0) + 75000);
    expect(cashAfter?.closing).toBe((cashBefore?.closing ?? 0) + 75000);
  });

  it("counts an expense as money paid out", async () => {
    const before = await post<Flow[]>("accounting.cashFlow");
    const cashBefore = before.find((flow) => flow.accountId === "acc-cash");

    await post("expenses.create", {
      amount: 20000,
      category: "Supplies",
      description: "Bin bags",
      paidFrom: "acc-cash",
    });

    const after = await post<Flow[]>("accounting.cashFlow");
    const cashAfter = after.find((flow) => flow.accountId === "acc-cash");

    expect(cashAfter?.paid).toBe((cashBefore?.paid ?? 0) + 20000);
    expect(cashAfter?.closing).toBe((cashBefore?.closing ?? 0) - 20000);
  });
});
