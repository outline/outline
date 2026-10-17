import type { Node as ProsemirrorNode, ResolvedPos } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection, Selection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/** Direction of vertical movement, -1 for up and 1 for down. */
type Direction = -1 | 1;

/**
 * A command that moves the selection up or down over inline nodes that are
 * rendered as blocks, such as images, and selects them as a block node would be.
 *
 * @param dir the direction to move, -1 for up and 1 for down.
 * @param isCandidate whether an inline node can be rendered as a block.
 * @returns A prosemirror command.
 */
export const selectBlockLikeVertically =
  (dir: Direction, isCandidate: (node: ProsemirrorNode) => boolean): Command =>
  (state, dispatch, view) => {
    if (!view) {
      return false;
    }

    const selection = findSelection(view, dir, isCandidate);
    if (!selection) {
      return false;
    }

    dispatch?.(state.tr.setSelection(selection).scrollIntoView());
    return true;
  };

/**
 * Finds the selection that results from moving up or down when a block-like
 * inline node is selected or next in the direction of travel.
 *
 * @returns the new selection, or undefined to use the default behavior.
 */
function findSelection(
  view: EditorView,
  dir: Direction,
  isCandidate: (node: ProsemirrorNode) => boolean
): Selection | undefined {
  const { doc, selection } = view.state;
  const matches = (node: ProsemirrorNode | null | undefined, pos: number) =>
    !!node && node.isInline && isCandidate(node) && rendersAsBlock(view, pos);

  // Moving off a selected block-like node.
  if (selection instanceof NodeSelection) {
    if (!matches(selection.node, selection.from)) {
      return undefined;
    }

    const $pos = dir > 0 ? selection.$to : selection.$from;
    const sibling = dir > 0 ? $pos.nodeAfter : $pos.nodeBefore;

    // Inline content beside the node is rendered on its own line.
    if (sibling) {
      const siblingPos = dir > 0 ? $pos.pos : $pos.pos - sibling.nodeSize;
      return matches(sibling, siblingPos)
        ? NodeSelection.create(doc, siblingPos)
        : TextSelection.create(doc, $pos.pos);
    }

    return selectionInNextTextblock(view, $pos, dir, matches);
  }

  if (!(selection instanceof TextSelection) || !selection.empty) {
    return undefined;
  }

  const { $head } = selection;
  if (!$head.parent.inlineContent) {
    return undefined;
  }

  // A block-like node in the same textblock, on the cursor's line.
  const parentStart = $head.start();
  let target: { node: ProsemirrorNode; pos: number } | undefined;
  $head.parent.forEach((node, offset) => {
    const pos = parentStart + offset;
    if (dir > 0 && pos >= $head.pos && !target && matches(node, pos)) {
      target = { node, pos };
    }
    if (dir < 0 && pos + node.nodeSize <= $head.pos && matches(node, pos)) {
      target = { node, pos };
    }
  });

  if (target) {
    const edge = dir > 0 ? target.pos : target.pos + target.node.nodeSize;
    if (edge === $head.pos || onCursorLine(view, edge, dir > 0 ? -1 : 1)) {
      return NodeSelection.create(doc, target.pos);
    }
    return undefined;
  }

  if (!view.endOfTextblock(dir > 0 ? "down" : "up")) {
    return undefined;
  }

  const next = selectionInNextTextblock(view, $head, dir, matches);
  return next instanceof NodeSelection ? next : undefined;
}

/**
 * Finds the selection in the textblock after or before the one that contains
 * the given position, selecting a block-like node at its edge. Returns
 * undefined when the result leaves the current table cell or is hidden.
 */
function selectionInNextTextblock(
  view: EditorView,
  $pos: ResolvedPos,
  dir: Direction,
  matches: (node: ProsemirrorNode | null | undefined, pos: number) => boolean
): Selection | undefined {
  const { doc } = view.state;
  const $start = doc.resolve(dir > 0 ? $pos.after() : $pos.before());
  const next = Selection.findFrom($start, dir);
  if (!next) {
    return undefined;
  }

  // Document order only matches vertical order inside the same isolating node.
  const [min, max] = isolatingRange($pos);
  if (next.from < min || next.to > max) {
    return undefined;
  }

  if (next instanceof TextSelection) {
    const { $head } = next;
    const node = dir > 0 ? $head.nodeAfter : $head.nodeBefore;
    const pos = dir > 0 ? $head.pos : $head.pos - (node?.nodeSize ?? 0);
    if (matches(node, pos)) {
      return NodeSelection.create(doc, pos);
    }
    if (!isRendered(view, $head.before())) {
      return undefined;
    }
  }

  return next;
}

function isolatingRange($pos: ResolvedPos): [number, number] {
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.spec.isolating) {
      return [$pos.start(depth), $pos.end(depth)];
    }
  }
  return [0, $pos.doc.content.size];
}

function isRendered(view: EditorView, pos: number) {
  const dom = view.nodeDOM(pos);
  return dom instanceof HTMLElement && dom.getClientRects().length > 0;
}

function rendersAsBlock(view: EditorView, pos: number) {
  const dom = view.nodeDOM(pos);
  return (
    dom instanceof HTMLElement &&
    dom.getClientRects().length > 0 &&
    !getComputedStyle(dom).display.startsWith("inline")
  );
}

function onCursorLine(view: EditorView, pos: number, side: Direction) {
  const cursor = view.coordsAtPos(view.state.selection.head);
  const other = view.coordsAtPos(pos, side);
  return cursor.top < other.bottom && other.top < cursor.bottom;
}
