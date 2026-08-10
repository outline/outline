import { createMachine } from "xstate";
import { attempt } from "./attempt";

/** Where a grooming appointment can be in its life. */
export type GroomingState = "booked" | "in_progress" | "done" | "cancelled";

/** What can be asked of an appointment. */
export type GroomingEvent =
  | { type: "START" }
  | { type: "FINISH" }
  | { type: "CANCEL" };

/**
 * A grooming appointment's lifecycle.
 *
 * Finishing a groom raises a sale and awards loyalty points. That was guarded
 * only by the appointment not already being done — but nothing stopped it
 * being moved back to in_progress first, and finishing it again then charged
 * the customer a second time. `done` being final is what closes that.
 */
export const groomingMachine = createMachine({
  id: "grooming",
  initial: "booked",
  types: {} as { events: GroomingEvent },
  states: {
    booked: {
      on: {
        START: "in_progress",
        // A groom can be finished without being started — the pet was seen,
        // somebody just never moved it on.
        FINISH: "done",
        CANCEL: "cancelled",
      },
    },
    in_progress: {
      on: {
        FINISH: "done",
        CANCEL: "cancelled",
      },
    },
    // Both are final: the money has moved, or the appointment was called off.
    done: {},
    cancelled: {},
  },
});

/** The move that would put an appointment into the asked-for state. */
const EVENT_FOR: Record<GroomingState, GroomingEvent | undefined> = {
  booked: undefined,
  in_progress: { type: "START" },
  done: { type: "FINISH" },
  cancelled: { type: "CANCEL" },
};

/**
 * Whether an appointment may move to a state, given where it is now.
 *
 * @param status the appointment's current state.
 * @param wanted the state being asked for.
 * @returns the state it would move to, or nothing when the move is refused.
 */
export function nextGroomingState(
  status: GroomingState,
  wanted: string
): GroomingState | undefined {
  const event = isGroomingState(wanted) ? EVENT_FOR[wanted] : undefined;
  if (!event) {
    return undefined;
  }
  const move = attempt<GroomingState>(groomingMachine, status, event);
  return move.ok ? move.next : undefined;
}

/**
 * Whether a string is a state an appointment can be in.
 *
 * @param value the string to check.
 * @returns true when it names a real state.
 */
export function isGroomingState(value: string): value is GroomingState {
  return (
    value === "booked" ||
    value === "in_progress" ||
    value === "done" ||
    value === "cancelled"
  );
}
