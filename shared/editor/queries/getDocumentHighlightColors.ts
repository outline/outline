import type { EditorState } from "prosemirror-state";

/**
 * Get all unique highlight colors used in the document.
 *
 * @param state The editor state.
 * @returns An array of unique hex color strings used for highlights in the document.
 */
export function getDocumentHighlightColors(state: EditorState): string[] {
  const colors = new Set<string>();

  state.doc.descendants((node) => {
    if (node.isText) {
      const highlightMark = node.marks.find((mark) => mark.type.name === "highlight");
      if (highlightMark?.attrs.color) {
        colors.add(highlightMark.attrs.color);
      }
    }
  });

  return Array.from(colors);
}
