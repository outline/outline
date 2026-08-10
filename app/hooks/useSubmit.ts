import { useMachine } from "@xstate/react";
import { useCallback } from "react";
import { submitMachine } from "~/machines/submit";

/** What a scene needs to run one save and report on it. */
export interface Submission {
  /** True while the save is in flight. */
  isBusy: boolean;
  /** What to tell the person when the last attempt did not go through. */
  notice: string | undefined;
  /**
   * Runs a save, if one is not already running.
   *
   * The task resolves to a message when the save did not go through, and to
   * nothing when it did.
   */
  run: (task: () => Promise<string | void>) => Promise<void>;
}

/**
 * Runs one save at a time and remembers why the last one failed.
 *
 * The machine, not this hook, is what refuses a second save while one is in
 * flight and what clears the last message when a new attempt starts. The
 * hook only does the awaiting, because the work a scene saves is different
 * every time and cannot live inside the machine.
 *
 * @returns the state of the save and a way to start one.
 */
export function useSubmit(): Submission {
  const [state, send] = useMachine(submitMachine);

  const run = useCallback(
    async (task: () => Promise<string | void>) => {
      // Refused while a save is already in flight, so a second click cannot
      // send the same thing twice.
      if (!state.can({ type: "SUBMIT" })) {
        return;
      }
      send({ type: "SUBMIT" });

      try {
        const notice = await task();
        if (notice) {
          send({ type: "FAIL", notice });
          return;
        }
        send({ type: "DONE" });
      } catch (_err) {
        send({ type: "FAIL", notice: "That did not go through." });
      }
    },
    [send, state]
  );

  return {
    isBusy: state.matches("submitting"),
    notice: state.context.notice,
    run,
  };
}
