import { assign, createMachine } from "xstate";
/** A line on a document being drawn up. Its shape is the scene's own. */
export type NoteLine = Record<string, unknown>;
/** What the machine remembers between moves. */
interface LinesContext {
  lines: NoteLine[];
}
/** What can be asked of the lines on a note. */
export type LinesEvent =
  | {
      type: "ADD";
      line: NoteLine;
    }
  | {
      type: "REMOVE";
      at: number;
    }
  | {
      type: "CLEAR";
    };
/**
 * The lines on an invoice or a purchase order being drawn up.
 *
 * Kept apart from the till's ticket on purpose. That machine's worth is the
 * rule that a sale cannot go past what is on the shelf, and loosening it to
 * cover a document with no stock behind it would throw away the only thing
 * it enforces. What these two share is the shape — empty until a line is
 * added, and a document with no lines cannot be issued — so that is all this
 * one holds.
 *
 * The line itself stays the scene's type: an invoice line and an order line
 * have different fields, and neither is this machine's business.
 */
export const linesMachine = createMachine({
  id: "lines",
  initial: "empty",
  context: { lines: [] } as LinesContext,
  types: {} as {
    context: LinesContext;
    events: LinesEvent;
  },
  states: {
    empty: {
      on: {
        ADD: {
          target: "holding",
          actions: assign({
            lines: ({ context, event }) => [...context.lines, event.line],
          }),
        },
      },
    },
    holding: {
      on: {
        ADD: {
          actions: assign({
            lines: ({ context, event }) => [...context.lines, event.line],
          }),
        },
        REMOVE: [
          {
            // Taking the last line off empties the note.
            target: "empty",
            guard: ({ context }) => context.lines.length <= 1,
            actions: assign({ lines: [] }),
          },
          {
            actions: assign({
              lines: ({ context, event }) =>
                context.lines.filter((_, at) => at !== event.at),
            }),
          },
        ],
        CLEAR: { target: "empty", actions: assign({ lines: [] }) },
      },
    },
  },
});
