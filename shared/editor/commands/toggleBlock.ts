import filter from "lodash/filter";
import findIndex from "lodash/findIndex";
import isNull from "lodash/isNull";
import isUndefined from "lodash/isUndefined";
import some from "lodash/some";
import { Node, ResolvedPos, Slice, Fragment } from "prosemirror-model";
import { Command, TextSelection, Transaction } from "prosemirror-state";
import { liftTarget, ReplaceAroundStep } from "prosemirror-transform";
import { v4 } from "uuid";
import ToggleBlock, { Action, On } from "../nodes/ToggleBlock";
import {
  atBlockEnd,
  atBlockStart,
  deleteSelectionTr,
  findCutAfter,
  findCutBefore,
  joinBackwardTr,
  joinForwardTr,
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

  if (!withinToggleBlockHead($from)) {
    return false;
  }

  const toggleBlock = $from.node($from.depth - 1);
  const { folded, detachBody, attachBody } = ToggleBlock.getUtils(state);
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

  if (!atEndOfToggleBlockHead($cursor)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  const { folded, detachBody, attachBody } = ToggleBlock.getUtils(state);
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

  if (!atEndOfToggleBlockHead($cursor)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  const { folded, detachBody, attachBody } = ToggleBlock.getUtils(state);
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
  if (!withinToggleBlock($cursor)) {
    return false;
  }

  const toggleBlock = nearest(
    ancestors($cursor!, (_$cursor, anc, _depth) => isToggleBlock(anc))
  );

  const pos = $cursor!.before(depth(toggleBlock!, $cursor!));
  const { folded } = ToggleBlock.getUtils(state);
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

  if (!(atStartOfToggleBlockHead($cursor) || atEndOfToggleBlockHead($cursor))) {
    return false;
  }

  const toggleBlock = $cursor.node(-1);
  if (headIsEmpty(toggleBlock)) {
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
  if (!atStartOfToggleBlockHead($cursor)) {
    return false;
  }

  const toggleBlock = $cursor!.node(-1);
  const empty = headIsEmpty(toggleBlock) && bodyIsEmpty(toggleBlock);
  if (!empty) {
    return false;
  }

  dispatch?.(liftChildrenOfNodeAt($cursor!.before(-1), state.tr));
  return true;
};

export const liftAllChildBlocksOfNodeBefore: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;
  if (!atStartOfToggleBlockHead($cursor)) {
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

  const ancestor = nearest(
    ancestors(
      $from,
      suchThat((_$fr, anc, _depth) => anc.type.name === "container_toggle")
    )
  );

  if (isUndefined(ancestor)) {
    return false;
  }

  const range = $from.blockRange(
    state.doc.resolve($from.end(depth(ancestor, $from)) - 1),
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

  if (!inMiddleOfToggleBlockHead($cursor)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  const { folded } = ToggleBlock.getUtils(state);
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

// Utils
const isToggleBlock = (node: Node) => node.type.name === "container_toggle";

const withinToggleBlock = ($cursor: ResolvedPos | null) =>
  $cursor && some(ancestors($cursor), isToggleBlock);

export const withinToggleBlockHead = ($cursor: ResolvedPos | null) =>
  withinToggleBlock($cursor) &&
  $cursor!.index(
    depth(
      nearest(
        ancestors($cursor!, (_$cursor, anc, _depth) => isToggleBlock(anc))
      )!,
      $cursor!
    )
  ) === 0;

const atStartOfToggleBlockHead = ($cursor: ResolvedPos | null) =>
  withinToggleBlockHead($cursor) && $cursor!.parentOffset === 0;

const inMiddleOfToggleBlockHead = ($cursor: ResolvedPos | null) =>
  withinToggleBlockHead($cursor) &&
  $cursor!.parentOffset > 0 &&
  $cursor!.parentOffset < $cursor!.node().content.size;

const headIsEmpty = (toggleBlock: Node) =>
  toggleBlock.firstChild!.content.size === 0;

export const bodyIsEmpty = (toggleBlock: Node) => {
  let empty = true;
  for (let i = 1; i < toggleBlock.childCount; i++) {
    empty &&= !toggleBlock.child(i).content.size;
    if (!empty) {
      break;
    }
  }
  return empty;
};

const atEndOfToggleBlockHead = ($cursor: ResolvedPos | null) =>
  withinToggleBlockHead($cursor) &&
  $cursor!.parentOffset === $cursor?.node().content.size;

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

export const depth = (ancestor: Node, $cursor: ResolvedPos) =>
  findIndex(ancestors($cursor), (node) => node.eq(ancestor));

export const ancestors = (
  $from: ResolvedPos,
  pred?: ($cursor: ResolvedPos, ancestor: Node, depth: number) => boolean
) => {
  const anc = [];

  // Notice that ancestors are arranged in increasing order of depth
  // within the array, which implies that the index of an ancestor
  // within the array actually represents its depth within the document.
  for (let d = 0; d <= $from.depth; d++) {
    anc.push($from!.node(d));
  }

  if (pred) {
    return filter(anc, (ancestor, index) =>
      // `index` represents the depth of the ancestor within the document,
      // so we simply pass it as `depth` to the predicate function.
      pred($from, ancestor, index)
    );
  }

  return anc;
};

export const suchThat = (
  pred: (...args: any[]) => boolean
): ((...args: any[]) => boolean) => pred;

const nearest = (ancestors: Node[]) =>
  // Since the ancestors are arranged in increasing order of depth,
  // the last element of the array is the nearest ancestor.
  ancestors.pop();

export const furthest = (ancestors: Node[]) => ancestors.shift();
