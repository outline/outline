import { Attrs } from "prosemirror-model";
import { Command, NodeSelection, TextSelection } from "prosemirror-state";
import { isMarkActive } from "../queries/isMarkActive";
import { chainTransactions } from "../lib/chainTransactions";
import { addMark } from "./addMark";
import { collapseSelection } from "./collapseSelection";
import { chainCommands } from "prosemirror-commands";

export const addComment = (attrs: Attrs): Command =>
  chainCommands(addCommentTextSelection(attrs), addCommentNodeSelection(attrs));

const addCommentNodeSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection)) {
      return false;
    }
    const { selection } = state;
    const existingMarks = selection.node.attrs.marks ?? [];
    const newMark = {
      type: "comment",
      attrs: {
        id: crypto.randomUUID(),
        userId: attrs.userId,
        draft: true,
      },
    };
    const newAttrs = {
      ...selection.node.attrs,
      marks: [...existingMarks, newMark],
    };
    dispatch?.(state.tr.setNodeMarkup(selection.from, undefined, newAttrs));
    return true;
  };

const addCommentTextSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof TextSelection)) {
      return false;
    }

    if (
      isMarkActive(
        state.schema.marks.comment,
        {
          resolved: false,
        },
        { exact: true }
      )(state)
    ) {
      return false;
    }

    chainTransactions(
      addMark(state.schema.marks.comment, {
        id: crypto.randomUUID(),
        userId: attrs.userId,
        draft: true,
      }),
      collapseSelection()
    )(state, dispatch);

    return true;
  };
