import isNull from "lodash/isNull";
import isUndefined from "lodash/isUndefined";
import { ResolvedPos, Slice, Fragment } from "prosemirror-model";
import { Command, TextSelection, Transaction } from "prosemirror-state";
import { liftTarget, ReplaceAroundStep } from "prosemirror-transform";
import { v4 } from "uuid";
import ToggleBlock, { Action, On } from "../nodes/ToggleBlock";
import {
  ancestors,
  atBlockEnd,
  atBlockStart,
  deleteSelectionTr,
  findCutAfter,
  findCutBefore,
  joinBackwardTr,
  joinForwardTr,
  nearest,
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
  const { isSelectionWithinToggleBlockHead, folded, detachBody, attachBody } =
    ToggleBlock.getUtils(state);
  if (!isSelectionWithinToggleBlockHead()) {
    return false;
  }

  const toggleBlock = $from.node($from.depth - 1);
  if (!folded(toggleBlock)) {
    return false;
  }

  const pos = $from.before($from.depth - 1);
  let tr = detachBody(pos, state.tr);
  tr = deleteSelectionTr(tr);
  tr = attachBody(pos, tr);
  dispatch?.(tr.scrollIntoView());
  return true;
};

export const joinForwardPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  const { isSelectionAtEndOfToggleBlockHead, folded, detachBody, attachBody } =
    ToggleBlock.getUtils(state);
  if (!isSelectionAtEndOfToggleBlockHead()) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (!folded(toggleBlock)) {
    return false;
  }

  const pos = $cursor!.before($cursor!.depth - 1);

  let tr = detachBody(pos, state.tr);
  tr = liftChildrenOfNodeAt(pos, tr);
  tr = joinForwardTr(tr);
  tr = wrapNodeAt(pos, toggleBlock.type, toggleBlock.attrs, tr);
  tr = attachBody(pos, tr);
  dispatch?.(tr);
  return true;
};

export const joinBackwardPreservingBody: Command = (state, dispatch) => {
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
  const { folded, detachBody, attachBody } = ToggleBlock.getUtils(state);
  if (!folded(toggleBlock)) {
    return false;
  }

  const pos = $cut.pos - toggleBlock.nodeSize;

  let tr = detachBody(pos, state.tr);
  tr = liftChildrenOfNodeAt(pos, tr);
  tr = joinBackwardTr(tr);
  tr = wrapNodeAt(pos, toggleBlock.type, toggleBlock.attrs, tr);
  tr = attachBody(pos, tr);
  dispatch?.(tr);
  return true;
};

export const selectNodeForwardPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  const { isSelectionAtEndOfToggleBlockHead, folded, detachBody, attachBody } =
    ToggleBlock.getUtils(state);
  if (!isSelectionAtEndOfToggleBlockHead()) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (!folded(toggleBlock)) {
    return false;
  }

  const pos = $cursor!.before($cursor!.depth - 1);
  let tr = detachBody(pos, state.tr);
  tr = selectNodeForwardTr(tr);
  tr = attachBody(pos, tr);
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
  const { folded, detachBody, attachBody } = ToggleBlock.getUtils(state);
  if (!folded(toggleBlock)) {
    return false;
  }

  const pos = $cursor.before() - toggleBlock.nodeSize;
  let tr = detachBody(pos, state.tr);
  tr = selectNodeBackwardTr(tr);
  tr = attachBody(pos, tr);
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
  const { isToggleBlock, isSelectionWithinToggleBlock } =
    ToggleBlock.getUtils(state);
  if (!isSelectionWithinToggleBlock()) {
    return false;
  }

  const toggleBlock = nearest(ancestors($cursor!, isToggleBlock));

  const { folded, depth } = ToggleBlock.getUtils(state);
  const pos = $cursor!.before(depth(toggleBlock!));
  dispatch?.(
    folded(toggleBlock!)
      ? state.tr
          .setMeta(ToggleBlock.actionPluginKey, {
            type: Action.UNFOLD,
            at: pos,
          })
          .setMeta(ToggleBlock.eventPluginKey, {
            type: On.UNFOLD,
            at: pos,
          })
      : state.tr
          .setMeta(ToggleBlock.actionPluginKey, {
            type: Action.FOLD,
            at: pos,
          })
          .setMeta(ToggleBlock.eventPluginKey, {
            type: On.FOLD,
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

  const {
    isSelectionAtStartOfToggleBlockHead,
    isSelectionAtEndOfToggleBlockHead,
  } = ToggleBlock.getUtils(state);
  if (
    !(
      isSelectionAtStartOfToggleBlockHead() ||
      isSelectionAtEndOfToggleBlockHead()
    )
  ) {
    return false;
  }

  const toggleBlock = $cursor.node(-1);
  if (ToggleBlock.isHeadEmpty(toggleBlock)) {
    return false;
  }
  const { folded } = ToggleBlock.getUtils(state);
  if (!folded(toggleBlock)) {
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
  const { isSelectionAtStartOfToggleBlockHead } = ToggleBlock.getUtils(state);
  if (!isSelectionAtStartOfToggleBlockHead()) {
    return false;
  }

  const toggleBlock = $cursor!.node(-1);
  if (!ToggleBlock.isEmpty(toggleBlock)) {
    return false;
  }

  dispatch?.(liftChildrenOfNodeAt($cursor!.before(-1), state.tr));
  return true;
};

export const liftAllChildBlocksOfNodeBefore: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;
  const { isSelectionAtStartOfToggleBlockHead } = ToggleBlock.getUtils(state);
  if (!isSelectionAtStartOfToggleBlockHead()) {
    return false;
  }

  dispatch?.(liftChildrenOfNodeAt($cursor!.before(-1), state.tr));
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
  const { $from } = state.selection as TextSelection;

  const { depth, isToggleBlock } = ToggleBlock.getUtils(state);
  const ancestor = nearest(ancestors($from, isToggleBlock));

  if (isUndefined(ancestor)) {
    return false;
  }

  const range = $from.blockRange(
    state.doc.resolve($from.end(depth(ancestor)) - 1),
    (node) => node.eq(ancestor)
  );
  if (isNull(range)) {
    return false;
  }

  const target = liftTarget(range);
  if (isNull(target)) {
    return false;
  }

  const tr = state.tr;
  tr.lift(range, target);
  if (dispatch) {
    dispatch(tr);
  }
  return true;
};

export const splitBlockPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  const { isSelectionInMiddleOfToggleBlockHead, folded } =
    ToggleBlock.getUtils(state);
  if (!isSelectionInMiddleOfToggleBlockHead()) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (!folded(toggleBlock)) {
    return false;
  }

  let tr = state.tr;
  tr = tr.insert(
    $cursor!.after(-1),
    toggleBlock.firstChild!.type.create(
      undefined,
      tr.doc.slice($cursor!.pos, $cursor!.end()).content
    )
  );
  tr = wrapNodeAt($cursor!.after(-1), toggleBlock.type, { id: v4() }, tr);
  tr = tr.setSelection(
    TextSelection.near(tr.doc.resolve($cursor!.after(-1)), 1)
  );
  tr = tr.delete($cursor!.pos, $cursor!.end());
  dispatch?.(tr);
  return true;
};

const liftChildrenOfNodeAt = (pos: number, tr: Transaction): Transaction => {
  const node = tr.doc.nodeAt(pos);
  const start = pos + 1;
  const end = start + node!.content.size;
  const $start = tr.doc.resolve(start);
  const $end = tr.doc.resolve(end);
  const range = $start.blockRange($end);
  if (isNull(range)) {
    return tr;
  }
  const target = liftTarget(range);
  if (isNull(target)) {
    return tr;
  }

  return tr.lift(range, target);
};

const prevSibling = ($from: ResolvedPos, depth?: number) => {
  const ancestor = $from.node(depth);
  const index = $from.index(depth);
  if (index === 0) {
    return null;
  }
  return ancestor.child(index - 1);
};
