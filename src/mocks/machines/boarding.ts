import { createMachine } from "xstate";
import { attempt } from "./attempt";

/** Where a stay can be in its life. */
export type BoardingState =
  | "booked"
  | "checked_in"
  | "checked_out"
  | "cancelled";

/** What can be asked of a stay. */
export type BoardingEvent =
  | { type: "CHECK_IN" }
  | { type: "CHECK_OUT" }
  | { type: "CANCEL" };

/**
 * A stay's lifecycle.
 *
 * `boardings.updateStatus` took whatever string the request carried and
 * asserted it into the status type, so nothing was checked at all: a stay
 * could go from checked_out back to checked_in, putting a guest in a room
 * nobody had booked, and a word like "banana" was written straight through.
 *
 * Occupancy counts the rooms whose stay is checked_in, so that mattered
 * beyond the record itself.
 */
export const boardingMachine = createMachine({
  id: "boarding",
  initial: "booked",
  types: {} as { events: BoardingEvent },
  states: {
    booked: {
      on: {
        CHECK_IN: "checked_in",
        CANCEL: "cancelled",
      },
    },
    checked_in: {
      on: {
        CHECK_OUT: "checked_out",
      },
    },
    // Both are final: a stay that has ended, or was called off, stays that way.
    checked_out: {},
    cancelled: {},
  },
});

/** The move that would put a stay into the asked-for state. */
const EVENT_FOR: Record<BoardingState, BoardingEvent | undefined> = {
  booked: undefined,
  checked_in: { type: "CHECK_IN" },
  checked_out: { type: "CHECK_OUT" },
  cancelled: { type: "CANCEL" },
};

/**
 * Whether a stay may move to a state, given where it is now.
 *
 * Takes the wanted state rather than an event because that is the shape the
 * endpoint is asked in — the app sends the status it wants set.
 *
 * @param status the stay's current state.
 * @param wanted the state being asked for.
 * @returns the state it would move to, or nothing when the move is refused.
 */
export function nextBoardingState(
  status: BoardingState,
  wanted: string
): BoardingState | undefined {
  const event = isBoardingState(wanted) ? EVENT_FOR[wanted] : undefined;
  if (!event) {
    return undefined;
  }
  const move = attempt<BoardingState>(boardingMachine, status, event);
  return move.ok ? move.next : undefined;
}

/**
 * Whether a string is a state a stay can be in.
 *
 * @param value the string to check.
 * @returns true when it names a real state.
 */
export function isBoardingState(value: string): value is BoardingState {
  return (
    value === "booked" ||
    value === "checked_in" ||
    value === "checked_out" ||
    value === "cancelled"
  );
}
