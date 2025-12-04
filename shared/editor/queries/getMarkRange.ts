import { ResolvedPos, MarkType } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";

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
 * @param selection Current node selection
 * @param type Mark type to check for
 * @returns Returns the mark, along with its range for a given NodeSelection, or false if the mark is not found.
 */
export function getMarkRangeNodeSelection(
  selection: NodeSelection,
  type: MarkType
) {
  const mark = (selection.node.attrs.marks ?? []).find(
    (mark: any) => mark.type === type.name
  );

  if (!mark) {
    return false;
  }

  return { from: selection.from, to: selection.to, mark };
}
