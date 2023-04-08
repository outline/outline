import { EditorState, Transaction } from "prosemirror-state";
import { Dispatch } from "../types";

export default function chainTransactions(
  ...commands: ((state: EditorState, dispatch?: Dispatch) => boolean)[]
) {
  return (state: EditorState, dispatch?: Dispatch): boolean => {
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
