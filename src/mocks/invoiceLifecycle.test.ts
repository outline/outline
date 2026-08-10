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

type Invoice = {
  id: string;
  number: string;
  status: "unpaid" | "partial" | "paid" | "void";
  total: number;
  due: number;
};

type JournalEntry = { id: string; reference: string; memo: string };

/** Raises an invoice nothing has been paid against yet. */
async function raiseInvoice(): Promise<Invoice> {
  const before = await post<Invoice[]>("invoices.list");
  await post("invoices.create", {
    customerName: "Lifecycle Test",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    items: [
      { description: "A service", quantity: 1, unitPrice: 100000, discount: 0 },
    ],
  });
  const after = await post<Invoice[]>("invoices.list");
  const raised = after.find(
    (invoice) => !before.some((seen) => seen.id === invoice.id)
  );
  if (!raised) {
    throw new Error("the invoice was not raised");
  }
  return raised;
}

describe("what an invoice will not do", () => {
  it("refuses to be voided twice", async () => {
    // Voiding writes a reversing entry into the journal. Doing it again
    // writes a second one, so the books would show the invoice reversed
    // twice and the receivable credited for more than was ever raised.
    const invoice = await raiseInvoice();
    await post("invoices.void", { id: invoice.id });

    const result = await post<{ voided: boolean; reason?: string }>(
      "invoices.void",
      { id: invoice.id }
    );

    expect(result.voided).toBe(false);
    expect(result.reason).toBe("already_void");
  });

  it("leaves one reversing entry in the books, not two", async () => {
    const invoice = await raiseInvoice();
    await post("invoices.void", { id: invoice.id });
    await post("invoices.void", { id: invoice.id });

    // Raising the invoice writes an entry too, so match the reversal itself
    // rather than everything carrying the invoice's number.
    const journal = await post<JournalEntry[]>("journal.list");
    const reversals = journal.filter(
      (entry) =>
        entry.reference === invoice.number && entry.memo.startsWith("Voided")
    );

    expect(reversals).toHaveLength(1);
  });

  it("still refuses to void one that has been paid against", async () => {
    const invoice = await raiseInvoice();
    await post("invoices.recordPayment", { id: invoice.id, amount: 1000 });

    const result = await post<{ voided: boolean; reason?: string }>(
      "invoices.void",
      { id: invoice.id }
    );

    expect(result.voided).toBe(false);
    expect(result.reason).toBe("has_payments");
  });

  it("still refuses a payment against a voided invoice", async () => {
    const invoice = await raiseInvoice();
    await post("invoices.void", { id: invoice.id });

    const result = await post<{ recorded: boolean; reason?: string }>(
      "invoices.recordPayment",
      { id: invoice.id, amount: 1000 }
    );

    expect(result.recorded).toBe(false);
    expect(result.reason).toBe("void");
  });
});
