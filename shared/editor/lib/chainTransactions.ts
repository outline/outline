import { Command, Transaction } from "prosemirror-state";

/**
 * Chain multiple commands into a single command and collects state as it goes.
 *
 * @param commands The commands to chain
 * @returns The chained command
 */
export function chainTransactions(
  ...commands: (Command | undefined)[]
): Command {
  return (state, dispatch): boolean => {
    const dispatcher = (tr: Transaction): void => {
      state = state.apply(tr);
      dispatch?.(tr);
    };
    const last = commands.pop();
    commands.map((command) => command?.(state, dispatcher));
    return last !== undefined && last(state, dispatch);
  };
}
