import filter from "lodash/filter";
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
import ToggleBlock from "../nodes/ToggleBlock";

export const lift: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  if (!atStartOfToggleBlockHead($cursor)) {
    return false;
  }

  const pos = $cursor!.before($cursor!.depth - 1);
  const tr = liftToggleBlockAt(pos, state.tr);

  if (dispatch) {
    dispatch(tr);
  }
  return true;
};

const isToggleBlock = (node: Node) => node.type.name === "toggle_block";

const withinToggleBlock = ($cursor: ResolvedPos | null) =>
  $cursor && some(ancestors($cursor), isToggleBlock);

const withinToggleBlockHead = ($cursor: ResolvedPos | null) =>
  withinToggleBlock($cursor) && $cursor!.index($cursor!.depth - 1) === 0;

const atStartOfToggleBlockHead = ($cursor: ResolvedPos | null) =>
  withinToggleBlockHead($cursor) && $cursor!.parentOffset === 0;

const inMiddleOrAtEndOfToggleBlockHead = ($cursor: ResolvedPos | null) =>
  withinToggleBlockHead($cursor) && $cursor!.parentOffset > 0;

const headIsEmpty = (toggleBlock: Node) =>
  toggleBlock.firstChild!.content.size === 0;

const folded = (toggleBlock: Node, state: EditorState) =>
  some(
    ToggleBlock.pluginKey
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

export const createParagraphBefore: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  if (!atStartOfToggleBlockHead($cursor)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (headIsEmpty(toggleBlock) || !folded(toggleBlock, state)) {
    return false;
  }

  const posBeforeToggleBlock = $cursor!.before($cursor!.depth - 1);
  const emptyParagraph = state.schema.nodes.paragraph.create({});
  const tr = state.tr;
  tr.insert(posBeforeToggleBlock, emptyParagraph);
  dispatch?.(tr);
  return true;
};

export const split: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;

  if (!inMiddleOrAtEndOfToggleBlockHead($cursor)) {
    return false;
  }

  const toggleBlock = $cursor!.node($cursor!.depth - 1);
  if (!folded(toggleBlock, state)) {
    return false;
  }

  const toggleBlockHead = toggleBlock.firstChild!;

  const tr = state.tr;
  const newToggleBlock = state.schema.nodes.toggle_block.create(
    undefined,
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

const maybeNextSibling = ($cursor: ResolvedPos | null) => {
  if (!$cursor) {
    return null;
  }

  const parentOfNearestAncestor = $cursor.node($cursor.depth - 1);
  const indexOfNearestAncestor = $cursor.index($cursor.depth - 1);
  const siblingOfNearestAncestor = parentOfNearestAncestor.maybeChild(
    indexOfNearestAncestor + 1
  );
  return siblingOfNearestAncestor;
};

const liftToggleBlockAt = (pos: number, tr: Transaction): Transaction => {
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

export const liftAfter: Command = (state, dispatch) => {
  const { $cursor } = state.selection as TextSelection;
  const nextSibling = maybeNextSibling($cursor);

  if (!(nextSibling && nextSibling.type.name === "toggle_block")) {
    return false;
  }

  const tr = liftToggleBlockAt($cursor!.after(), state.tr);

  if (dispatch) {
    dispatch(tr);
  }

  return true;
};

const prevSibling = ($from: ResolvedPos, depth?: number) => {
  const ancestor = $from.node(depth);
  const index = $from.index(depth);
  if (index === 0) {
    return null;
  }
  return ancestor.child(index - 1);
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

const ancestors = (
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

const suchThat = (
  pred: (...args: any[]) => boolean
): ((...args: any[]) => boolean) => pred;

const nearest = (ancestors: Node[]) =>
  // Since the ancestors are arranged in increasing order of depth,
  // the last element of the array is the nearest ancestor.
  ancestors.pop();

export const liftLastBlockOutOf =
  (type: NodeType): Command =>
  (state, dispatch) => {
    const { $from, $to } = state.selection as TextSelection;

    const ancestor = nearest(
      ancestors(
        $from,
        suchThat(
          ($fr, anc, depth) =>
            anc.type === type &&
            anc.childCount > 0 &&
            $fr.index(depth) === anc.childCount - 1
        )
      )
    );

    if (isUndefined(ancestor)) {
      return false;
    }

    const range = $from.blockRange($to, (node) => node.eq(ancestor));
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
