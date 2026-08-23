import { createActor } from "xstate";
import { describe, expect, it } from "vitest";
import { ticketMachine } from "./ticket";
/** A line for a product with no sizes. */
const line = (productId: string, price = 1000) => ({
  productId,
  name: productId,
  price,
  quantity: 1,
});
/** A ticket with nothing on it yet. */
const start = () => createActor(ticketMachine).start();
describe("the ticket at the till", () => {
  it("starts empty", () => {
    expect(start().getSnapshot().value).toBe("empty");
  });
  it("holds a line once one is added", () => {
    const till = start();
    till.send({ type: "ADD", line: line("prd-1"), available: 5 });
    expect(till.getSnapshot().value).toBe("holding");
    expect(till.getSnapshot().context.lines).toHaveLength(1);
  });
  it("refuses to sell more than is on the shelf", () => {
    // The old code returned the list unchanged from inside a setState
    // callback, which reads as a no-op rather than a refusal.
    const till = start();
    till.send({ type: "ADD", line: line("prd-1"), available: 2 });
    till.send({ type: "ADD", line: line("prd-1"), available: 2 });
    till.send({ type: "ADD", line: line("prd-1"), available: 2 });
    expect(till.getSnapshot().context.lines[0].quantity).toBe(2);
  });
  it("refuses a product with none left at all", () => {
    const till = start();
    till.send({ type: "ADD", line: line("prd-1"), available: 0 });
    expect(till.getSnapshot().value).toBe("empty");
  });
  it("goes back to empty when the last line is taken off", () => {
    const till = start();
    till.send({ type: "ADD", line: line("prd-1"), available: 5 });
    till.send({ type: "SET_QUANTITY", key: "prd-1", quantity: 0 });
    expect(till.getSnapshot().value).toBe("empty");
    expect(till.getSnapshot().context.lines).toHaveLength(0);
  });
  it("stays holding while another line is still on it", () => {
    const till = start();
    till.send({ type: "ADD", line: line("prd-1"), available: 5 });
    till.send({ type: "ADD", line: line("prd-2"), available: 5 });
    till.send({ type: "SET_QUANTITY", key: "prd-1", quantity: 0 });
    expect(till.getSnapshot().value).toBe("holding");
    expect(till.getSnapshot().context.lines).toHaveLength(1);
  });
  it("cannot be added to from empty when nothing is available", () => {
    const till = start();
    expect(till.getSnapshot().can({ type: "CLEAR" })).toBe(false);
  });
});
