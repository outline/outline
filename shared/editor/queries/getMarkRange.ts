import type { NodeAttrMark } from "@shared/editor/types";
import type { ResolvedPos, MarkType } from "prosemirror-model";
import type { NodeSelection } from "prosemirror-state";

/**
 * Returns the mark of type along with its range for a given ResolvedPos,
 * or false if the mark is not found.
 *
 * @param $pos The ResolvedPos to check.
 * @param type The MarkType to look for.
 * @returns An object containing the from and to positions and the mark, or false.
 */
export function getMarkRange($pos?: ResolvedPos, type?: MarkType) {
  if (!$pos || !type) {
    return false;
  }

  const start = $pos.parent.childAfter($pos.parentOffset);
  if (!start.node) {
    return false;
  }

  const mark = start.node.marks.find((m) => m.type === type);
  if (!mark) {
    return false;
  }

  let startIndex = $pos.index();
  let startPos = $pos.start() + start.offset;
  let endIndex = startIndex + 1;
  let endPos = startPos + start.node.nodeSize;

  while (
    startIndex > 0 &&
    mark.isInSet($pos.parent.child(startIndex - 1).marks)
  ) {
    startIndex -= 1;
    startPos -= $pos.parent.child(startIndex).nodeSize;
  }

  while (
    endIndex < $pos.parent.childCount &&
    mark.isInSet($pos.parent.child(endIndex).marks)
  ) {
    endPos += $pos.parent.child(endIndex).nodeSize;
    endIndex += 1;
  }

  return { from: startPos, to: endPos, mark };
}

/**
 * Returns the mark of type along with its range for a given NodeSelection,
 * or false if the mark is not found.
 *
 * @param selection The NodeSelection to check.
 * @param type The MarkType to look for.
 * @returns An object containing the from and to positions and the mark, or false.
 */
export function getMarkRangeNodeSelection(
  selection: NodeSelection,
  type: MarkType
) {
  const mark = (selection.node.attrs.marks ?? []).find(
    (mark: NodeAttrMark) => mark.type === type.name
  );

  if (!mark) {
    return false;
  }

  return { from: selection.from, to: selection.to, mark };
}
