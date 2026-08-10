import { createMachine } from "xstate";
import { attempt } from "./attempt";

/** Where a staff record can be. */
export type StaffState = "active" | "on_leave" | "inactive";

/** What can be asked of a staff record. */
export type StaffEvent =
  | { type: "RETURN" }
  | { type: "GO_ON_LEAVE" }
  | { type: "LEAVE" };

/**
 * A staff record's lifecycle.
 *
 * staff.setStatus asserted the request's string into the status type rather
 * than checking it, so any word was written straight through — and sign-in
 * reads this field to decide who may in, so a nonsense value there is not
 * only cosmetic.
 *
 * inactive is final: somebody who has left stays left. Nothing sends it
 * today — the app only moves people on and off leave — but sign-in already
 * treats it as a hard stop, so the machine keeps it a one-way door rather
 * than inventing a way back that no screen offers.
 */
export const staffMachine = createMachine({
  id: "staff",
  initial: "active",
  types: {} as { events: StaffEvent },
  states: {
    active: {
      on: { GO_ON_LEAVE: "on_leave", LEAVE: "inactive" },
    },
    on_leave: {
      on: { RETURN: "active", LEAVE: "inactive" },
    },
    inactive: {},
  },
});

/** The move that would put a record into the asked-for state. */
const EVENT_FOR: Record<StaffState, StaffEvent> = {
  active: { type: "RETURN" },
  on_leave: { type: "GO_ON_LEAVE" },
  inactive: { type: "LEAVE" },
};

/**
 * Whether a staff record may move to a state, given where it is now.
 *
 * @param status the record's current state.
 * @param wanted the state being asked for.
 * @returns the state it would move to, or nothing when the move is refused.
 */
export function nextStaffState(
  status: StaffState,
  wanted: string
): StaffState | undefined {
  if (!isStaffState(wanted)) {
    return undefined;
  }
  const move = attempt<StaffState>(staffMachine, status, EVENT_FOR[wanted]);
  return move.ok ? move.next : undefined;
}

/**
 * Whether a string is a state a staff record can be in.
 *
 * @param value the string to check.
 * @returns true when it names a real state.
 */
export function isStaffState(value: string): value is StaffState {
  return value === "active" || value === "on_leave" || value === "inactive";
}
