import { Mark } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

export function getMarksBetween(
  start: number,
  end: number,
  state: EditorState
) {
  let marks: { start: number; end: number; mark: Mark }[] = [];

  state.doc.nodesBetween(start, end, (node, pos) => {
    marks = [
      ...marks,
      ...node.marks.map((mark) => ({
        start: pos,
        end: pos + node.nodeSize,
        mark,
      })),
    ];
  });

  return marks;
}
