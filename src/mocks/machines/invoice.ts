import { createMachine } from "xstate";
import { attempt } from "./attempt";

/** The only thing an invoice actually stores about where it stands. */
export type InvoiceState = "open" | "void";

/** What can be asked of an invoice. */
export type InvoiceEvent =
  | { type: "RECORD_PAYMENT" }
  | { type: "VOID"; hasPayments: boolean };

/**
 * An invoice's lifecycle.
 *
 * Deliberately only two states. What the app shows – unpaid, partial, paid –
 * is not stored and is not a transition: it is worked out from the payments
 * against the total, in `priceInvoice`. Putting it in here would mean storing
 * it, and a stored status can drift from the payments it claims to describe.
 * So the machine covers what is genuinely kept: whether the invoice stands.
 *
 * Recording a payment is a move the machine allows without moving — it is
 * listed so that "may I?" has an answer, and so a voided invoice refuses it.
 */
export const invoiceMachine = createMachine({
  id: "invoice",
  initial: "open",
  types: {} as { events: InvoiceEvent },
  states: {
    open: {
      on: {
        RECORD_PAYMENT: { target: "open" },
        // Money has already changed hands against it, so voiding would strand
        // that payment; it has to be refunded first.
        VOID: { target: "void", guard: ({ event }) => !event.hasPayments },
      },
    },
    void: {},
  },
});

/** Why a move was refused. */
export type InvoiceRefusal = "void" | "has_payments" | "already_void";

/**
 * Whether an invoice may take a move, and why not when it may not.
 *
 * @param status whether the invoice stands or has been voided.
 * @param event the move being attempted.
 * @returns the state it would move to, or the reason it cannot.
 */
export function nextInvoiceState(
  status: InvoiceState,
  event: InvoiceEvent
): { ok: true; next: InvoiceState } | { ok: false; reason: InvoiceRefusal } {
  const move = attempt<InvoiceState>(invoiceMachine, status, event);

  if (move.ok) {
    return { ok: true, next: move.next };
  }
  if (event.type === "RECORD_PAYMENT") {
    return { ok: false, reason: "void" };
  }
  return {
    ok: false,
    reason: status === "void" ? "already_void" : "has_payments",
  };
}
