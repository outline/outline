import isNull from "lodash/isNull";
import some from "lodash/some";
import { Node, NodeType, ResolvedPos, Slice } from "prosemirror-model";
import { Command, EditorState, TextSelection } from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";
import ToggleBlock from "../nodes/ToggleBlock";

export function liftChildrenUp(type: NodeType): Command {
  return (state, dispatch) => {
    const { $cursor } = state.selection as TextSelection;
    if (!$cursor) {
      return false;
    }
    const parent = $cursor.node($cursor.depth - 1);
    if (parent.type.name !== type.name) {
      return false;
    }

    const start = $cursor.start($cursor.depth - 1);
    if ($cursor.pos !== start + 1) {
      return false;
    }
    const end = $cursor.end($cursor.depth - 1);

    const $start = state.doc.resolve(start);
    const $end = state.doc.resolve(end);
    const range = $start.blockRange($end);
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
}

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
