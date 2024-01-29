import { Command, Transaction } from "prosemirror-state";

export default function chainTransactions(...commands: Command[]): Command {
  return (state, dispatch): boolean => {
    const dispatcher = (tr: Transaction): void => {
      state = state.apply(tr);
      dispatch?.(tr);
    };
    const last = commands.pop();
    const reduced = commands.reduce(
      (result, command) => result || command(state, dispatcher),
      false
    );
    return reduced && last !== undefined && last(state, dispatch);
  };
}
