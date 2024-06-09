import { InputRule as ProsemirrorInputRule } from "prosemirror-inputrules";
import { EditorState } from "prosemirror-state";
import { isInCode } from "../queries/isInCode";

/**
 * A factory function for creating Prosemirror input rules that automatically insert text
 * that matches a given regular expression unless the selection is inside a code block or code mark.
 */
export class InputRule extends ProsemirrorInputRule {
  constructor(rule: RegExp, insert: string) {
    super(
      rule,
      (
        state: EditorState,
        match: RegExpMatchArray,
        start: number,
        end: number
      ) => {
        if (isInCode(state)) {
          return null;
        }

        if (match[1]) {
          const offset = match[0].lastIndexOf(match[1]);
          insert += match[0].slice(offset + match[1].length);
          start += offset;
          const cutOff = start - end;
          if (cutOff > 0) {
            insert = match[0].slice(offset - cutOff, offset) + insert;
            start = end;
          }
        }

        return state.tr.insertText(insert, start, end);
      }
    );
  }
}
