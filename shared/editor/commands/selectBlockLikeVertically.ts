import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { NodeSelection, Selection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/** Direction of vertical movement, -1 for up and 1 for down. */
type Direction = -1 | 1;

/** Layout queries that need the rendered editor. */
export interface VerticalLayout {
  /** Whether the cursor is on the first or last line of its textblock in the direction of travel. */
  atTextblockEdge: () => boolean;
  /** Whether the cursor is on the same visual line as the given position. */
  onCursorLine: (pos: number, side: Direction) => boolean;
}

/**
 * A command that moves the selection up or down over inline nodes that display
 * as blocks, such as images, and selects them as a block node would be.
 *
 * @param dir the direction to move, -1 for up and 1 for down.
 * @param isBlockLike whether an inline node displays as a block.
 * @returns A prosemirror command.
 */
export const selectBlockLikeVertically =
  (dir: Direction, isBlockLike: (node: ProsemirrorNode) => boolean): Command =>
  (state, dispatch, view) => {
    if (!view) {
      return false;
    }

    const selection = findBlockLikeSelection(
      state,
      dir,
      isBlockLike,
      layoutFromView(view, dir)
    );
    if (!selection) {
      return false;
    }

    dispatch?.(state.tr.setSelection(selection).scrollIntoView());
    return true;
  };

/**
 * Finds the selection that results from moving up or down when an inline node
 * that displays as a block is selected or next in the direction of travel.
 *
 * @param state the editor state.
 * @param dir the direction to move, -1 for up and 1 for down.
 * @param isBlockLike whether an inline node displays as a block.
 * @param layout queries against the rendered editor.
 * @returns the new selection, or undefined to use the default behavior.
 */
export function findBlockLikeSelection(
  state: EditorState,
  dir: Direction,
  isBlockLike: (node: ProsemirrorNode) => boolean,
  layout: VerticalLayout
): Selection | undefined {
  const { doc, selection } = state;
  const matches = (node: ProsemirrorNode | null | undefined) =>
    !!node && node.isInline && isBlockLike(node);

  // Moving off a selected block-like node.
  if (selection instanceof NodeSelection) {
    if (!matches(selection.node)) {
      return undefined;
    }

    const $pos = dir > 0 ? selection.$to : selection.$from;
    const sibling = dir > 0 ? $pos.nodeAfter : $pos.nodeBefore;

    // Inline content beside the node is rendered on its own line.
    if (sibling) {
      return matches(sibling)
        ? NodeSelection.create(
            doc,
            dir > 0 ? $pos.pos : $pos.pos - sibling.nodeSize
          )
        : TextSelection.create(doc, $pos.pos);
    }

    return selectionInNextTextblock(state, $pos.pos, dir, matches);
  }

  if (!(selection instanceof TextSelection) || !selection.empty) {
    return undefined;
  }

  const { $head } = selection;
  if (!$head.parent.inlineContent) {
    return undefined;
  }

  // A block-like node later in the same textblock, on the cursor's line.
  const parentStart = $head.start();
  let target: { node: ProsemirrorNode; pos: number } | undefined;
  $head.parent.forEach((node, offset) => {
    const pos = parentStart + offset;
    if (!matches(node)) {
      return;
    }
    if (dir > 0 && pos >= $head.pos && !target) {
      target = { node, pos };
    }
    if (dir < 0 && pos + node.nodeSize <= $head.pos) {
      target = { node, pos };
    }
  });

  if (target) {
    const edge = dir > 0 ? target.pos : target.pos + target.node.nodeSize;
    if (edge === $head.pos || layout.onCursorLine(edge, dir > 0 ? -1 : 1)) {
      return NodeSelection.create(doc, target.pos);
    }
    return undefined;
  }

  if (!layout.atTextblockEdge()) {
    return undefined;
  }

  const next = selectionInNextTextblock(state, $head.pos, dir, matches);
  return next instanceof NodeSelection ? next : undefined;
}

/**
 * Finds the selection in the textblock after or before the textblock that
 * contains the given position, selecting a block-like node at its edge.
 */
function selectionInNextTextblock(
  state: EditorState,
  pos: number,
  dir: Direction,
  matches: (node: ProsemirrorNode | null | undefined) => boolean
): Selection | undefined {
  const { doc } = state;
  const $pos = doc.resolve(pos);
  const $start = doc.resolve(dir > 0 ? $pos.after() : $pos.before());
  const next = Selection.findFrom($start, dir);
  if (!next) {
    return undefined;
  }

  if (next instanceof TextSelection) {
    const node = dir > 0 ? next.$head.nodeAfter : next.$head.nodeBefore;
    if (node && matches(node)) {
      return NodeSelection.create(
        doc,
        dir > 0 ? next.$head.pos : next.$head.pos - node.nodeSize
      );
    }
  }

  return next;
}

function layoutFromView(view: EditorView, dir: Direction): VerticalLayout {
  return {
    atTextblockEdge: () => view.endOfTextblock(dir > 0 ? "down" : "up"),
    onCursorLine: (pos, side) => {
      const cursor = view.coordsAtPos(view.state.selection.head);
      const other = view.coordsAtPos(pos, side);
      return cursor.top < other.bottom && other.top < cursor.bottom;
    },
  };
}
