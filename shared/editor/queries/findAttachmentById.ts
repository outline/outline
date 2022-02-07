import { EditorState } from "prosemirror-state";

const findAttachmentById = function (
  state: EditorState,
  id: string
): [number, number] | null {
  let result: [number, number] | null = null;

  state.doc.descendants((node, pos) => {
    if (result) {
      return false;
    }
    if (node.type.name === "attachment" && node.attrs.id === id) {
      result = [pos, pos + node.nodeSize];
      return false;
    }
    return true;
  });

  return result;
};

export default findAttachmentById;
