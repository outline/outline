import { Node as PMNode, Mark } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import Node from "../nodes/Node";

export default function getMarkAttrs(state: EditorState, type: Node) {
  const { from, to } = state.selection;
  let marks: Mark[] = [];

  state.doc.nodesBetween(from, to, (node: PMNode) => {
    marks = [...marks, ...node.marks];

    if (node.content) {
      node.content.forEach(content => {
        marks = [...marks, ...content.marks];
      });
    }
  });

  const mark = marks.find(markItem => markItem.type.name === type.name);

  if (mark) {
    return mark.attrs;
  }

  return {};
}
