import { InputRule } from "prosemirror-inputrules";
import { MarkType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { getMarksBetween } from "../queries/getMarksBetween";

/**
 * A factory function for creating Prosemirror plugins that automatically apply a mark to text
 * that matches a given regular expression.
 *
 * @param regexp The regular expression to match
 * @param markType The mark type to apply
 * @param getAttrs A function that returns the attributes to apply to the mark
 * @returns The input rule
 */
export default function markInputRule(
  regexp: RegExp,
  markType: MarkType,
  getAttrs?: (match: string[]) => Record<string, unknown>
): InputRule {
  return new InputRule(
    regexp,
    (state: EditorState, match: string[], start: number, end: number) => {
      const attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
      const { tr } = state;
      const captureGroup = match[match.length - 1];
      const fullMatch = match[0];
      const startSpaces = fullMatch.search(/\S/);

      if (captureGroup) {
        const matchStart = start + fullMatch.indexOf(captureGroup);
        const textStart = start + fullMatch.lastIndexOf(captureGroup);
        const textEnd = textStart + captureGroup.length;

        const excludedMarks = getMarksBetween(start, end, state)
          .filter((item) => item.mark.type.excludes(markType))
          .filter((item) => item.end > matchStart);

        if (excludedMarks.length) {
          return null;
        }

        if (textEnd < end) {
          tr.delete(textEnd, end);
        }
        if (textStart > start) {
          tr.delete(start + startSpaces, textStart);
        }
        end = start + startSpaces + captureGroup.length;
      }

      tr.addMark(start + startSpaces, end, markType.create(attrs));
      tr.removeStoredMark(markType);
      return tr;
    }
  );
}
