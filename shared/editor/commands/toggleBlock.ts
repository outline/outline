import filter from "lodash/filter";
import findIndex from "lodash/findIndex";
import isNull from "lodash/isNull";
import isUndefined from "lodash/isUndefined";
import some from "lodash/some";
import {
  Node,
  NodeType,
  ResolvedPos,
  Slice,
  Fragment,
} from "prosemirror-model";
import {
  Command,
  EditorState,
  TextSelection,
  Transaction,
} from "prosemirror-state";
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
  if (!folded(toggleBlock, state)) {
    return false;
  }

  const pos = $from.before($from.depth - 1);
  const { detachBody, attachBody } = getUtils(pos);
  let tr = detachBody(state.tr);
  tr = deleteSelectionTr(tr);
  tr = attachBody(tr);
  dispatch?.(tr.scrollIntoView());
  return true;
};

export const joinForwardPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  if (!atEndOfToggleBlockHead($cursor)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (!folded(toggleBlock, state)) {
    return false;
  }

  const pos = $cursor!.before($cursor!.depth - 1);

  const { detachBody, attachBody } = getUtils(pos);
  let tr = detachBody(state.tr);
  tr = liftChildrenOfNodeAt(pos, tr);
  tr = joinForwardTr(tr);
  tr = wrapNodeAt(pos, toggleBlock.type, toggleBlock.attrs, tr);
  tr = attachBody(tr);
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
  if (!folded(toggleBlock, state)) {
    return false;
  }

  const pos = $cut.pos - toggleBlock.nodeSize;

  const { detachBody, attachBody } = getUtils(pos);
  let tr = detachBody(state.tr);
  tr = liftChildrenOfNodeAt(pos, tr);
  tr = joinBackwardTr(tr);
  tr = wrapNodeAt(pos, toggleBlock.type, toggleBlock.attrs, tr);
  tr = attachBody(tr);
  dispatch?.(tr);
  return true;
};

export const selectNodeForwardPreservingBody: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  if (!atEndOfToggleBlockHead($cursor)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (!folded(toggleBlock, state)) {
    return false;
  }

  const pos = $cursor!.before($cursor!.depth - 1);
  const { detachBody, attachBody } = getUtils(pos);
  let tr = detachBody(state.tr);
  tr = selectNodeForwardTr(tr);
  tr = attachBody(tr);
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
  if (!folded(toggleBlock, state)) {
    return false;
  }

  const pos = $cursor.before() - toggleBlock.nodeSize;
  const { detachBody, attachBody } = getUtils(pos);
  let tr = detachBody(state.tr);
  tr = selectNodeBackwardTr(tr);
  tr = attachBody(tr);
  dispatch?.(tr);
  return true;
};

export const sinkBlockInto =
  (type: NodeType): Command =>
  (state, dispatch) => {
    const { $from } = state.selection;

    let before = -1;
    for (let depth = $from.depth; depth >= 0; depth--) {
      const nodeBefore = prevSibling($from, depth);
      if (nodeBefore && nodeBefore.type === type) {
        // before of nodeBefore
        before = $from.posAtIndex($from.index(depth) - 1, depth);
        break;
      }
    }

    if (before === -1) {
      return false;
    }

    const slice = new Slice(Fragment.from(type.create()), 1, 0);

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

  dispatch?.(
    folded(toggleBlock!, state)
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
  if (!folded(toggleBlock, state)) {
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

  const isEmpty = (node: Node) => {
    let empty = false;
    node.forEach((child) => {
      empty = !child.content.size;
    });
    return empty;
  };

  const toggleBlock = $cursor!.node(-1);
  if (!isEmpty(toggleBlock)) {
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

export const liftConsecutiveBlocks: Command = (state, dispatch) => {
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
  if (!folded(toggleBlock, state) || bodyIsEmpty(toggleBlock)) {
    return false;
  }

  const toggleBlockHead = toggleBlock.firstChild!;

  const tr = state.tr;
  const newToggleBlock = state.schema.nodes["container_toggle"].create(
    { id: v4() },
    toggleBlockHead.type.create(
      undefined,
      tr.doc.slice($cursor!.pos, $cursor!.end()).content
    )
  );
  tr.replace($cursor!.pos, $cursor!.end(), Slice.empty);
  const { $cursor: $newCursorPos } = tr.selection as TextSelection;
  const posAfterToggleBlock = $newCursorPos!.after($newCursorPos!.depth - 1);
  tr.insert(posAfterToggleBlock, newToggleBlock).setSelection(
    TextSelection.near(tr.doc.resolve(posAfterToggleBlock))
  );
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
  let bodyContent = "";
  toggleBlock.forEach((child, _, index) => {
    if (index === 0) {
      return;
    }

    bodyContent += child.textContent.trim();
  });

  return bodyContent.length === 0;
};

const atEndOfToggleBlockHead = ($cursor: ResolvedPos | null) =>
  withinToggleBlockHead($cursor) &&
  $cursor!.parentOffset === $cursor?.node().content.size;

export const folded = (toggleBlock: Node, state: EditorState) =>
  some(
    ToggleBlock.actionPluginKey
      .getState(state)
      ?.find(
        undefined,
        undefined,
        (spec) =>
          spec.nodeId === toggleBlock.attrs.id &&
          spec.target === toggleBlock.type.name &&
          spec.fold === true
      )
  );

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
  for (let depth = 0; depth <= $from.depth; depth++) {
    anc.push($from!.node(depth));
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

const getUtils = (pos: number) => {
  let body: Fragment;
  const detachBody = (tr: Transaction) => {
    const $start = tr.doc.resolve(pos + 1);
    const toggleBlock = tr.doc.nodeAt(pos);

    const posBeforeBody = $start.pos + toggleBlock!.firstChild!.nodeSize;
    const posAfterBody = $start.end();
    body = tr.doc.slice(posBeforeBody, posAfterBody).content;

    return tr.replace(posBeforeBody, posAfterBody, Slice.empty);
  };

  const attachBody = (tr: Transaction) => {
    const $start = tr.doc.resolve(pos + 1);
    const toggleBlock = tr.doc.nodeAt(pos);

    const posAfterHead = $start.pos + toggleBlock!.firstChild!.nodeSize;
    return tr.insert(posAfterHead, body);
  };

  return { detachBody, attachBody };
};
