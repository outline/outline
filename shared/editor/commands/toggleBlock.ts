import isNull from "lodash/isNull";
import some from "lodash/some";
import { Node, ResolvedPos, Slice } from "prosemirror-model";
import {
  Command,
  EditorState,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";
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

const withinToggleBlock = ($cursor: ResolvedPos | null) =>
  $cursor && $cursor.node($cursor.depth - 1).type.name === "toggle_block";

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
