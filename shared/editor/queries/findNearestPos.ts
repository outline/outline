import { clamp } from "es-toolkit";
import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/**
 * Find the position in the document nearest to the given viewport coordinates.
 * Unlike `posAtCoords`, coordinates that fall outside of the editor are clamped
 * to its bounds so that a position is always returned.
 *
 * @param view the editor view.
 * @param coords the viewport coordinates.
 * @returns a position in the document that a selection can be placed at.
 */
export function findNearestPos(
  view: EditorView,
  coords: { left: number; top: number }
): number {
  const { doc } = view.state;
  const rect = view.dom.getBoundingClientRect();
  const top = clamp(coords.top, rect.top + 1, rect.bottom - 1);
  const result =
    view.posAtCoords({
      left: clamp(coords.left, rect.left + 1, rect.right - 1),
      top,
    }) ??
    // The clamped point can still land in the space between two blocks, in
    // which case fall back to the start of the nearest line.
    view.posAtCoords({ left: rect.left + 1, top });

  return TextSelection.near(doc.resolve(result?.pos ?? doc.nodeSize - 2)).from;
}
