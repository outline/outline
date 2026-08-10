import { createMachine } from "xstate";
import { attempt } from "./attempt";

/** Where a purchase order can be in its life. */
export type PurchaseOrderState =
  | "draft"
  | "ordered"
  | "partial"
  | "received"
  | "cancelled";

/** What can be asked of a purchase order. */
export type PurchaseOrderEvent =
  | { type: "RECEIVE"; isComplete: boolean }
  | { type: "CANCEL" };

/**
 * A purchase order's lifecycle.
 *
 * Unlike the other five, this one found nothing wrong: purchaseOrders
 * .receive already refused a closed order, clamped each line to what was
 * still outstanding, and turned down a delivery of nothing. The machine
 * states those rules in the same place as the rest rather than leaving this
 * aggregate the odd one out — the reason it is here is uniformity, not a bug.
 *
 * Whether a delivery lands on partial or received is decided by the lines,
 * so the dispatcher works that out and hands it in as `isComplete`.
 */
export const purchaseOrderMachine = createMachine({
  id: "purchaseOrder",
  initial: "ordered",
  types: {} as { events: PurchaseOrderEvent },
  states: {
    draft: {
      on: {
        RECEIVE: [
          { target: "received", guard: ({ event }) => event.isComplete },
          { target: "partial" },
        ],
        CANCEL: "cancelled",
      },
    },
    ordered: {
      on: {
        RECEIVE: [
          { target: "received", guard: ({ event }) => event.isComplete },
          { target: "partial" },
        ],
        CANCEL: "cancelled",
      },
    },
    partial: {
      on: {
        RECEIVE: [
          { target: "received", guard: ({ event }) => event.isComplete },
          { target: "partial" },
        ],
        CANCEL: "cancelled",
      },
    },
    // Both are closed: the goods are all in, or the order was called off.
    received: {},
    cancelled: {},
  },
});

/**
 * Whether a purchase order may take a move, and where it lands.
 *
 * @param status the order's current state.
 * @param event the move being attempted.
 * @returns the state it would move to, or nothing when the move is refused.
 */
export function nextPurchaseOrderState(
  status: PurchaseOrderState,
  event: PurchaseOrderEvent
): PurchaseOrderState | undefined {
  const move = attempt<PurchaseOrderState>(purchaseOrderMachine, status, event);
  return move.ok ? move.next : undefined;
}
