import { assign, createMachine } from "xstate";
import type { CartLine } from "~/stores/shop";
/** What the machine remembers between moves. */
interface TicketContext {
  lines: CartLine[];
}
/** What can be asked of a ticket. */
export type TicketEvent =
  | {
      type: "ADD";
      line: CartLine;
      available: number;
    }
  | {
      type: "SET_QUANTITY";
      key: string;
      quantity: number;
    }
  | {
      type: "CLEAR";
    };
/** A line is identified by the size sold, when it has one. */
const keyOf = (line: CartLine) => line.variantId ?? line.productId;
/** How many of a line the ticket already holds. */
const heldSoFar = (lines: CartLine[], key: string) =>
  lines.find((line) => keyOf(line) === key)?.quantity ?? 0;
/** The ticket with one more of a line on it. */
const withOneMore = (lines: CartLine[], line: CartLine): CartLine[] => {
  const key = keyOf(line);
  return lines.some((held) => keyOf(held) === key)
    ? lines.map((held) =>
        keyOf(held) === key ? { ...held, quantity: held.quantity + 1 } : held
      )
    : [...lines, line];
};
/**
 * The ticket at the till.
 *
 * Two things were being held by convention rather than by rule. Never
 * selling more than is on the shelf lived inside a setState callback that
 * quietly returned the list unchanged, which reads as a no-op rather than a
 * refusal. And "you cannot charge an empty ticket" was the Charge button's
 * disabled attribute — the same thing that failed to stop a double submit.
 *
 * Empty and holding are separate states, so charging is simply not offered
 * from one of them.
 */
export const ticketMachine = createMachine({
  id: "ticket",
  initial: "empty",
  context: { lines: [] } as TicketContext,
  types: {} as {
    context: TicketContext;
    events: TicketEvent;
  },
  states: {
    empty: {
      on: {
        ADD: {
          target: "holding",
          guard: ({ event }) => event.available > 0,
          actions: assign({
            lines: ({ context, event }) =>
              withOneMore(context.lines, event.line),
          }),
        },
      },
    },
    holding: {
      on: {
        ADD: {
          // Never sell more than is on the shelf.
          guard: ({ context, event }) =>
            heldSoFar(context.lines, keyOf(event.line)) < event.available,
          actions: assign({
            lines: ({ context, event }) =>
              withOneMore(context.lines, event.line),
          }),
        },
        SET_QUANTITY: [
          {
            // Taking the last line off empties the ticket.
            target: "empty",
            guard: ({ context, event }) =>
              event.quantity <= 0 &&
              context.lines.filter((line) => keyOf(line) !== event.key)
                .length === 0,
            actions: assign({ lines: [] }),
          },
          {
            actions: assign({
              lines: ({ context, event }) =>
                event.quantity <= 0
                  ? context.lines.filter((line) => keyOf(line) !== event.key)
                  : context.lines.map((line) =>
                      keyOf(line) === event.key
                        ? { ...line, quantity: event.quantity }
                        : line
                    ),
            }),
          },
        ],
        CLEAR: { target: "empty", actions: assign({ lines: [] }) },
      },
    },
  },
});
