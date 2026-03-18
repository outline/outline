import type { EditorState } from "prosemirror-state";

/**
 * Get all unique text colors used in the document.
 *
 * @param state - the editor state.
 * @returns an array of unique hex color strings used for text color in the document.
 */
export function getDocumentTextColors(state: EditorState): string[] {
  const colors = new Set<string>();

  state.doc.descendants((node) => {
    if (node.isText) {
      const textColorMark = node.marks.find(
        (mark) => mark.type.name === "textColor"
      );
      if (textColorMark?.attrs.color) {
        colors.add(textColorMark.attrs.color);
      }
    }
  });

  return Array.from(colors);
}
