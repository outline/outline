import { useMachine } from "@xstate/react";
import { useCallback } from "react";
import { fieldsMachine } from "~/machines/fields";

/** What a scene needs to hold a form's values. */
export interface Fields {
  /** What a field is holding. */
  get: (field: string) => string;
  /** Records what was typed into a field. */
  set: (field: string, value: string) => void;
  /** Puts every field back to what the form started with. */
  reset: () => void;
  /** True once something has been typed and not put back. */
  isDirty: boolean;
}

/**
 * Holds a form's values in one place.
 *
 * Replaces a useState per field and the list of setters that had to be
 * called to clear them after a save; `reset` cannot fall out of step with
 * the fields the way that list could.
 *
 * @param initial what each field starts with.
 * @returns the form's values and how to change them.
 */
export function useFields(initial: Record<string, string> = {}): Fields {
  // The starting values are also what RESET puts back.
  const [state, send] = useMachine(fieldsMachine, { input: { initial } });

  const set = useCallback(
    (field: string, value: string) => send({ type: "SET", field, value }),
    [send]
  );
  const reset = useCallback(() => send({ type: "RESET" }), [send]);
  const get = useCallback(
    (field: string) => state.context.values[field] ?? "",
    [state.context.values]
  );

  return { get, set, reset, isDirty: state.matches("dirty") };
}
