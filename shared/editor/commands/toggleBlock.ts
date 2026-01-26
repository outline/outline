import {
  chainCommands,
  joinTextblockBackward,
  splitBlock,
} from "prosemirror-commands";
import { Slice, Fragment } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { liftTarget, ReplaceAroundStep } from "prosemirror-transform";
import { v4 } from "uuid";
import ToggleBlock, {
  Action,
  toggleEventPluginKey,
  toggleFoldPluginKey,
} from "../nodes/ToggleBlock";
import {
  isToggleBlock,
  isToggleBlockFolded,
  getToggleBlockDepth,
  isSelectionInToggleBlock,
  isSelectionInToggleBlockHead,
  isSelectionInToggleBlockBody,
  isSelectionAtStartOfToggleBlockHead,
  isSelectionInMiddleOfToggleBlockHead,
  isSelectionAtEndOfToggleBlockHead,
  detachToggleBlockBody,
  attachToggleBlockBody,
} from "../queries/toggleBlock";
import {
  ancestors,
  atBlockEnd,
  atBlockStart,
  deleteSelectionTr,
  findCutAfter,
  findCutBefore,
  joinBackwardTr,
  joinForwardTr,
  liftChildrenOfNodeAt,
  nearest,
  prevSibling,
  selectNodeBackwardTr,
  selectNodeForwardTr,
  wrapNodeAt,
} from "../utils";

// Commands
export const deleteSelectionPreservingBody: Command = (state, dispatch) => {
  if (state.selection.empty) {
    return false;
  }

  const { $from } = state.selection;
  if (!isSelectionInToggleBlockHead(state)) {
    return false;
  }

  const toggleBlock = $from.node($from.depth - 1);
  if (!isToggleBlockFolded(state, toggleBlock)) {
    return false;
  }

  const pos = $from.before($from.depth - 1);
  const { tr: tr1, body } = detachToggleBlockBody(pos, state.tr);
  let tr = deleteSelectionTr(tr1);
  tr = attachToggleBlockBody(pos, body, tr);
  dispatch?.(tr.scrollIntoView());
  return true;
};

export const joinForwardPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  if (!isSelectionAtEndOfToggleBlockHead(state)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (!isToggleBlockFolded(state, toggleBlock)) {
    return false;
  }

  const pos = $cursor!.before($cursor!.depth - 1);

  const { tr: tr1, body } = detachToggleBlockBody(pos, state.tr);
  let tr = liftChildrenOfNodeAt(pos, tr1);
  tr = joinForwardTr(tr);
  tr = wrapNodeAt(pos, toggleBlock.type, toggleBlock.attrs, tr);
  tr = attachToggleBlockBody(pos, body, tr);
  dispatch?.(tr);
  return true;
};

export const joinBackwardWithHead: Command = (state, dispatch) => {
  const $cursor = atBlockStart(state.selection);
  if (!$cursor) {
    return false;
  }

  const $cut = findCutBefore($cursor);
  if (!$cut) {
    return false;
  }
  if (!$cut.nodeBefore || $cut.nodeBefore.type.name !== "container_toggle") {
    return false;
  }

  const toggleBlock = $cut.nodeBefore;
  if (isToggleBlockFolded(state, toggleBlock)) {
    const pos = $cut.pos - toggleBlock.nodeSize;

    const { tr: tr1, body } = detachToggleBlockBody(pos, state.tr);
    let tr = liftChildrenOfNodeAt(pos, tr1);
    tr = joinBackwardTr(tr);
    tr = wrapNodeAt(pos, toggleBlock.type, toggleBlock.attrs, tr);
    tr = attachToggleBlockBody(pos, body, tr);
    dispatch?.(tr);
    return true;
  }

  return joinTextblockBackward(state, dispatch);
};

export const joinBackwardWithBody: Command = (state, dispatch) => {
  const $cursor = atBlockStart(state.selection);
  if (!$cursor) {
    return false;
  }

  const $cut = findCutBefore($cursor);
  if (!$cut) {
    return false;
  }
  if (!$cut.nodeBefore || $cut.nodeBefore.type.name !== "container_toggle") {
    return false;
  }

  const toggleBlock = $cut.nodeBefore;
  if (isToggleBlockFolded(state, toggleBlock)) {
    return false;
  }

  return joinTextblockBackward(state, dispatch);
};

export const joinBackwardWithToggleblock: Command = chainCommands(
  joinBackwardWithHead,
  joinBackwardWithBody
);

export const selectNodeForwardPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  if (!isSelectionAtEndOfToggleBlockHead(state)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (!isToggleBlockFolded(state, toggleBlock)) {
    return false;
  }

  const pos = $cursor!.before($cursor!.depth - 1);
  const { tr: tr1, body } = detachToggleBlockBody(pos, state.tr);
  let tr = selectNodeForwardTr(tr1);
  tr = attachToggleBlockBody(pos, body, tr);
  dispatch?.(tr);
  return true;
};

export const selectNodeBackwardPreservingBody: Command = (state, dispatch) => {
  const $cursor = atBlockStart(state.selection);
  if (!$cursor) {
    return false;
  }

  const $cut = findCutBefore($cursor);
  if (!$cut) {
    return false;
  }

  if (!$cut.nodeBefore || $cut.nodeBefore.type.name !== "container_toggle") {
    return false;
  }

  const toggleBlock = $cut.nodeBefore;
  if (!isToggleBlockFolded(state, toggleBlock)) {
    return false;
  }

  const pos = $cursor.before() - toggleBlock.nodeSize;
  const { tr: tr1, body } = detachToggleBlockBody(pos, state.tr);
  let tr = selectNodeBackwardTr(tr1);
  tr = attachToggleBlockBody(pos, body, tr);
  dispatch?.(tr);
  return true;
};

export const indentBlock: Command = (state, dispatch) => {
  const { $from } = state.selection;

  let before = -1;
  for (let d = $from.depth; d >= 0; d--) {
    const nodeBefore = prevSibling($from, d);
    if (nodeBefore && nodeBefore.type === state.schema.nodes.container_toggle) {
      // before of nodeBefore
      before = $from.posAtIndex($from.index(d) - 1, d);
      break;
    }
  }

  if (before === -1) {
    return false;
  }

  const slice = new Slice(
    Fragment.from(state.schema.nodes.container_toggle.create()),
    1,
    0
  );

  const from = before + state.doc.nodeAt(before)!.nodeSize;
  const to = from + state.doc.nodeAt(from)!.nodeSize;
  const step = new ReplaceAroundStep(from - 1, to, from, to, slice, 0, true);

  const tr = state.tr.step(step).scrollIntoView();
  if (dispatch) {
    dispatch(tr);
  }

  return true;
};

export const toggleBlock: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;
  if (!isSelectionInToggleBlock(state)) {
    return false;
  }

  const isToggle = isToggleBlock(state);
  const toggle = nearest(ancestors($cursor!).filter(isToggle));
  if (!toggle) {
    return false;
  }

  const d = getToggleBlockDepth($cursor!, toggle);
  const pos = $cursor!.before(d);
  const isFolded = isToggleBlockFolded(state, toggle);

  dispatch?.(
    state.tr
      .setMeta(toggleFoldPluginKey, {
        type: isFolded ? Action.UNFOLD : Action.FOLD,
        at: pos,
      })
      .setMeta(toggleEventPluginKey, {
        type: isFolded ? Action.UNFOLD : Action.FOLD,
        at: pos,
      })
  );

  return true;
};

export const createParagraphNearPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;
  if (!$cursor) {
    return false;
  }

  const atStart = isSelectionAtStartOfToggleBlockHead(state);
  const atEnd = isSelectionAtEndOfToggleBlockHead(state);
  if (!atStart && !atEnd) {
    return false;
  }

  const toggle = $cursor.node(-1);
  if (ToggleBlock.isHeadEmpty(toggle)) {
    return false;
  }
  if (!isToggleBlockFolded(state, toggle)) {
    return false;
  }

  const pos = atBlockStart(state.selection)
    ? $cursor.before(-1)
    : $cursor.after(-1);

  let tr = state.tr;
  tr = tr.insert(pos, state.schema.nodes.paragraph.create());
  const $before = tr.doc.resolve(tr.selection.$from.before(-1));
  const $after = tr.doc.resolve(tr.selection.$to.after(-1));
  tr = atBlockStart(tr.selection)
    ? tr.setSelection(TextSelection.near($before))
    : tr.setSelection(TextSelection.near($after));

  dispatch?.(tr);
  return true;
};

export const liftAllEmptyChildBlocks: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;
  if (!$cursor || !isSelectionAtStartOfToggleBlockHead(state)) {
    return false;
  }

  const toggle = $cursor.node(-1);
  if (!ToggleBlock.isEmpty(toggle)) {
    return false;
  }

  dispatch?.(liftChildrenOfNodeAt($cursor.before(-1), state.tr));
  return true;
};

export const liftAllChildBlocksOfNodeBefore: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;
  if (!$cursor || !isSelectionAtStartOfToggleBlockHead(state)) {
    return false;
  }

  dispatch?.(liftChildrenOfNodeAt($cursor.before(-1), state.tr));
  return true;
};

export const liftAllChildBlocksOfNodeAfter: Command = (state, dispatch) => {
  const $cursor = atBlockEnd(state.selection);
  if (!$cursor) {
    return false;
  }

  const $cut = findCutAfter($cursor);
  if (!$cut) {
    return false;
  }
  if (!$cut.nodeAfter || $cut.nodeAfter.type.name !== "container_toggle") {
    return false;
  }

  dispatch?.(liftChildrenOfNodeAt($cut.pos, state.tr));

  return true;
};

export const dedentBlocks: Command = (state, dispatch) => {
  const { $from } = state.selection;

  const isToggle = isToggleBlock(state);
  const ancestor = nearest(ancestors($from).filter(isToggle));

  if (!ancestor) {
    return false;
  }

  const d = getToggleBlockDepth($from, ancestor);
  const $fr_ =
    state.selection instanceof NodeSelection
      ? state.doc.resolve($from.pos + 1)
      : $from;
  const $to_ = state.doc.resolve($from.end(d) - 1);
  const range = $fr_.blockRange($to_, (node) => node.eq(ancestor));
  if (range === null) {
    return false;
  }

  const target = liftTarget(range);
  if (target === null) {
    return false;
  }

  const tr = state.tr;
  tr.lift(range, target);
  if (dispatch) {
    dispatch(tr);
  }

  return true;
};

/**
 * Exit toggle block when pressing Enter in the last empty paragraph within the body.
 */
export const exitToggleBlockOnEmptyParagraph: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;
  if (!$cursor) {
    return false;
  }

  if (!isSelectionInToggleBlockBody(state)) {
    return false;
  }

  // Check if current node is an empty paragraph
  const node = $cursor.parent;
  if (node.type !== state.schema.nodes.paragraph || node.content.size > 0) {
    return false;
  }

  // Check if this is the last node in the toggle block body
  const parentOfParagraph = $cursor.node(-1);
  if ($cursor.index(-1) !== parentOfParagraph.childCount - 1) {
    return false;
  }

  // Check if the paragraph is a direct child of the toggle block
  if (parentOfParagraph.type !== state.schema.nodes.container_toggle) {
    return false;
  }

  // Find the toggle block ancestor
  const isToggle = isToggleBlock(state);
  const ancestor = nearest(ancestors($cursor).filter(isToggle));
  if (!ancestor) {
    return false;
  }

  // Create a range scoped to the toggle block ancestor
  const d = getToggleBlockDepth($cursor, ancestor);
  const $start = state.doc.resolve($cursor.start(d + 1));
  const $end = state.doc.resolve($cursor.end(d + 1));
  const range = $start.blockRange($end, (n) => n.eq(ancestor));
  if (range === null) {
    return false;
  }

  const target = liftTarget(range);
  if (target === null) {
    return false;
  }

  const tr = state.tr;
  tr.lift(range, target);
  dispatch?.(tr);

  return true;
};

export const splitBlockPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  if (!isSelectionInMiddleOfToggleBlockHead(state)) {
    return false;
  }

  const toggle = $cursor!.node($cursor!.depth - 1);
  if (!isToggleBlockFolded(state, toggle)) {
    return false;
  }

  let tr = state.tr;
  tr = tr.insert(
    $cursor!.after(-1),
    toggle.firstChild!.type.create(
      undefined,
      tr.doc.slice($cursor!.pos, $cursor!.end()).content
    )
  );
  tr = wrapNodeAt($cursor!.after(-1), toggle.type, { id: v4() }, tr);
  tr = tr.setSelection(
    TextSelection.near(tr.doc.resolve($cursor!.after(-1)), 1)
  );
  tr = tr.delete($cursor!.pos, $cursor!.end());
  dispatch?.(tr);
  return true;
};

export const splitTopLevelBlockWithinBody: Command = (state, dispatch) => {
  const { $from } = state.selection;
  if (!isSelectionInToggleBlockBody(state)) {
    return false;
  }

  const isToggle = isToggleBlock(state);
  const ancestor = nearest(ancestors($from).filter(isToggle));
  if (!ancestor) {
    return false;
  }

  const d = getToggleBlockDepth($from, ancestor);
  if (d === $from.depth - 1) {
    // split if the block containing cursor is a direct child of a toggle block
    return splitBlock(state, dispatch);
  }

  return false;
};
