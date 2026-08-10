import { createMachine, getNextSnapshot } from "xstate";

/** Where a sale can be in its life. */
export type OrderState = "draft" | "paid" | "refunded" | "void";

/** What can be asked of a sale. */
export type OrderEvent =
  | { type: "PAY" }
  | { type: "VOID"; hasReturns: boolean }
  | { type: "REFUND" };

/**
 * A sale's lifecycle.
 *
 * The rules were already here, spread across `handleShopRequest` as guard
 * clauses — and one of them was missing: `orders.markPaid` checked nothing,
 * so a voided sale could be marked paid again, counting as revenue a second
 * time against stock that had already gone back on the shelf.
 *
 * The machine decides *whether* a move is allowed. The dispatcher still does
 * *what* the move means — stock, journal entries, movements — because those
 * are effects on the whole shop, not on the order alone.
 */
export const orderMachine = createMachine({
  id: "order",
  initial: "draft",
  types: {} as { events: OrderEvent },
  states: {
    draft: {
      on: {
        PAY: "paid",
        VOID: "void",
      },
    },
    paid: {
      on: {
        // Money has already moved back for part of it, so voiding the whole
        // sale would refund it twice.
        VOID: { target: "void", guard: ({ event }) => !event.hasReturns },
        REFUND: "refunded",
      },
    },
    // Both are final: a sale that has been undone stays undone.
    refunded: {},
    void: {},
  },
});

/** Why a move was refused. */
export type OrderRefusal =
  | "already_paid"
  | "not_paid"
  | "has_returns"
  | "already_void"
  | "already_refunded";

/**
 * Whether a sale may take a move, and why not when it may not.
 *
 * @param status the sale's current state.
 * @param event the move being attempted.
 * @returns the state it would move to, or the reason it cannot.
 */
export function nextOrderState(
  status: OrderState,
  event: OrderEvent
): { ok: true; next: OrderState } | { ok: false; reason: OrderRefusal } {
  const snapshot = orderMachine.resolveState({ value: status, context: {} });
  const after = getNextSnapshot(orderMachine, snapshot, event);

  // A refused move leaves the machine where it was, whether that is because
  // no transition is defined or because a guard turned it down.
  if (after.value === status) {
    return { ok: false, reason: refusalFor(status, event) };
  }
  return { ok: true, next: after.value as OrderState };
}

/**
 * Names the reason a move was refused, for the caller to report.
 *
 * A refused VOID keeps the wording the endpoint already used, including
 * "not_paid" for a sale that is void or refunded. It reads oddly, but the
 * answer is on the wire and one scene already switches on it, so renaming it
 * belongs to its own change rather than riding along with the machine.
 */
function refusalFor(status: OrderState, event: OrderEvent): OrderRefusal {
  if (event.type === "VOID") {
    return status === "paid" ? "has_returns" : "not_paid";
  }
  if (status === "void") {
    return "already_void";
  }
  if (status === "refunded") {
    return "already_refunded";
  }
  return "already_paid";
}
