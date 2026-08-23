import { assign, createMachine } from "xstate";
/** What the machine remembers between moves. */
interface SubmitContext {
  /** What to tell the person about the attempt that just finished. */
  notice?: string;
}
/** What can be asked of a submission. */
export type SubmitEvent =
  | {
      type: "SUBMIT";
    }
  | {
      type: "SETTLED";
      notice?: string;
    };
/**
 * One attempt to save something.
 *
 * Seventeen scenes each kept this as an `isSaving` boolean beside a `notice`
 * string, and the pair invited two bugs. Nothing stopped a second submit
 * while the first was still going, because the button's `disabled` was the
 * only thing holding it back — a fast second click got through. And the
 * notice from a failed attempt stayed on screen through the next one, so it
 * read as if the new attempt had failed too.
 *
 * SUBMIT is only accepted from idle, which closes the first. Starting an
 * attempt clears the notice, which closes the second.
 *
 * The notice is whatever the attempt has to say, not only why it failed:
 * "Refund recorded." wants clearing on the next attempt for the same reason
 * a refusal does.
 */
export const submitMachine = createMachine({
  id: "submit",
  initial: "idle",
  context: {} as SubmitContext,
  types: {} as {
    context: SubmitContext;
    events: SubmitEvent;
  },
  states: {
    idle: {
      on: {
        SUBMIT: {
          target: "submitting",
          actions: assign({ notice: undefined }),
        },
      },
    },
    submitting: {
      on: {
        SETTLED: {
          target: "idle",
          actions: assign({ notice: ({ event }) => event.notice }),
        },
      },
    },
  },
});
