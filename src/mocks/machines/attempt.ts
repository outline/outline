import type { AnyStateMachine, EventObject } from "xstate";
import { getNextSnapshot } from "xstate";

/** What a machine says about a move it was asked to make. */
export type Attempt<S extends string> =
  | { ok: true; next: S }
  | { ok: false; next: S };

/**
 * Asks a machine whether a record may take a move, without running it.
 *
 * The records live in the mock's state, not in a running actor, so each
 * decision starts from the status already stored against the record. `can`
 * is what separates a move that is refused from one that is allowed but
 * leaves the record where it is — a payment against an open invoice, say.
 * Comparing the resulting state value instead would call that second case a
 * refusal.
 *
 * The caller names the reason: why a move is not allowed is the domain's
 * wording, not the machine's.
 *
 * @param machine the lifecycle to consult.
 * @param status the record's stored state.
 * @param event the move being attempted.
 * @returns whether it is allowed, and the state it lands in.
 */
export function attempt<S extends string>(
  machine: AnyStateMachine,
  status: S,
  event: EventObject
): Attempt<S> {
  const snapshot = machine.resolveState({ value: status, context: {} });

  if (!snapshot.can(event)) {
    return { ok: false, next: status };
  }
  const after = getNextSnapshot(machine, snapshot, event);
  return { ok: true, next: after.value as S };
}
