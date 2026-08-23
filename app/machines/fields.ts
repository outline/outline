import { assign, createMachine } from "xstate";
/** What the machine remembers between moves. */
interface FieldsContext {
  /** What has been typed, by field name. */
  values: Record<string, string>;
  /** What the form started with, so it can be put back. */
  initial: Record<string, string>;
}
/** What the form starts with. */
export interface FieldsInput {
  initial: Record<string, string>;
}
/** What can be asked of a form's fields. */
export type FieldsEvent =
  | {
      type: "SET";
      field: string;
      value: string;
    }
  | {
      type: "RESET";
    };
/**
 * The values a form is holding.
 *
 * A text field is not a state machine and pretending otherwise would be
 * ceremony. What is one is whether the form has been touched: pristine until
 * something is typed, dirty afterwards, pristine again once it is put back.
 * Scenes reset their fields by hand after a save — a list of setters that
 * has to be kept in step with the list of fields — and that is the part the
 * machine takes over.
 */
export const fieldsMachine = createMachine({
  id: "fields",
  initial: "pristine",
  context: ({ input }: { input: FieldsInput }) => ({
    values: input.initial,
    initial: input.initial,
  }),
  types: {} as {
    context: FieldsContext;
    events: FieldsEvent;
    input: FieldsInput;
  },
  states: {
    pristine: {
      on: {
        SET: {
          target: "dirty",
          actions: assign({
            values: ({ context, event }) => ({
              ...context.values,
              [event.field]: event.value,
            }),
          }),
        },
      },
    },
    dirty: {
      on: {
        SET: {
          actions: assign({
            values: ({ context, event }) => ({
              ...context.values,
              [event.field]: event.value,
            }),
          }),
        },
        RESET: {
          target: "pristine",
          actions: assign({ values: ({ context }) => context.initial }),
        },
      },
    },
  },
});
