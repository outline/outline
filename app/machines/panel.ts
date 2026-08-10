import { assign, createMachine } from "xstate";

/** What the machine remembers between moves. */
interface PanelContext {
  /** Which panel is open, when one is. */
  panel?: string;
}

/** What can be asked of the panels on a page. */
export type PanelEvent = { type: "OPEN"; panel: string } | { type: "CLOSE" };

/**
 * The one panel a page has open.
 *
 * Scenes kept a boolean per panel — isAdding beside isInviting beside
 * editing — and nothing tied them together. Opening "New staff" and then
 * "Invite" left both forms on the page at once, each with its own submit
 * button, because both booleans were true and neither knew about the other.
 *
 * One value cannot hold two panels, so the state that caused it cannot be
 * written down any more.
 */
export const panelMachine = createMachine({
  id: "panel",
  initial: "closed",
  context: {} as PanelContext,
  types: {} as { context: PanelContext; events: PanelEvent },
  states: {
    closed: {
      on: {
        OPEN: {
          target: "open",
          actions: assign({ panel: ({ event }) => event.panel }),
        },
      },
    },
    open: {
      on: {
        // Opening another panel from an open one swaps them rather than
        // stacking, which is what a page with one form at a time wants.
        OPEN: {
          target: "open",
          actions: assign({ panel: ({ event }) => event.panel }),
        },
        CLOSE: {
          target: "closed",
          actions: assign({ panel: undefined }),
        },
      },
    },
  },
});
